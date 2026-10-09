package httpapi_test

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/auth"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/domain"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/httpapi"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/notify"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/realtime"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/seed"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/service"
	"github.com/prithwirajmukherjee15-cmd/traackly/server/internal/store"
)

// testHasher keeps bcrypt fast under -race; production cost is asserted in the auth tests.
var testHasher = &auth.Hasher{Cost: 4}

const (
	testSecret  = "test-secret-test-secret-test-secret!"
	authzEmail  = "founder@ncbp.in"
	authzPass   = "founder123"
	testBaseURL = "http://app.test"
)

type fakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

type captureMailer struct {
	mu   sync.Mutex
	sent []notify.Message
	fail bool
}

func (m *captureMailer) Send(_ context.Context, msg notify.Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.fail {
		return errors.New("smtp down")
	}
	m.sent = append(m.sent, msg)
	return nil
}

func (m *captureMailer) to(addr string) []notify.Message {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []notify.Message
	for _, s := range m.sent {
		if s.To == addr {
			out = append(out, s)
		}
	}
	return out
}

type env struct {
	t     *testing.T
	srv   *httptest.Server
	svc   *service.Service
	st    *store.Store
	clock *fakeClock
	mail  *captureMailer
	hub   *realtime.Hub
	authz *domain.User
	mc    *mongo.Client
	app   string
}

// failpoint makes the given commands on one collection fail for this env's connection only,
// after letting the first skip matching commands through. It needs mongod --setParameter enableTestCommands=1.
func (e *env) failpoint(coll string, skip int, cmds ...string) {
	e.t.Helper()
	var mode any = "alwaysOn"
	if skip > 0 {
		mode = bson.D{{Key: "skip", Value: skip}}
	}
	err := e.mc.Database("admin").RunCommand(context.Background(), bson.D{
		{Key: "configureFailPoint", Value: "failCommand"},
		{Key: "mode", Value: mode},
		{Key: "data", Value: bson.D{
			{Key: "failCommands", Value: cmds},
			{Key: "errorCode", Value: 2},
			{Key: "appName", Value: e.app},
			{Key: "namespace", Value: e.app + "." + coll},
		}},
	}).Err()
	if err != nil {
		e.t.Skipf("failCommand unavailable (start mongod with enableTestCommands=1): %v", err)
	}
	e.t.Cleanup(e.clearFailpoint)
}

func (e *env) clearFailpoint() {
	_ = e.mc.Database("admin").RunCommand(context.Background(), bson.D{
		{Key: "configureFailPoint", Value: "failCommand"}, {Key: "mode", Value: "off"},
	}).Err()
}

func newEnv(t *testing.T) *env {
	t.Helper()
	uri := os.Getenv("TRAACKLY_TEST_MONGODB_URI")
	if uri == "" {
		t.Skip("TRAACKLY_TEST_MONGODB_URI not set")
	}
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	ctx := context.Background()
	app := "traackly_test_" + hex.EncodeToString(b)
	mc, err := mongo.Connect(options.Client().ApplyURI(uri).SetAppName(app))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	db := mc.Database(app)
	t.Cleanup(func() {
		_ = db.Drop(ctx)
		_ = mc.Disconnect(ctx)
	})
	// Anchored at real time: MongoDB's TTL monitor deletes sessions by wall clock.
	clock := &fakeClock{now: time.Now().UTC().Truncate(time.Second)}
	st := store.New(db, clock.Now)
	if err := st.EnsureIndexes(ctx); err != nil {
		t.Fatal(err)
	}
	if err := st.SeedDepartments(ctx); err != nil {
		t.Fatal(err)
	}
	e := &env{t: t, st: st, clock: clock, mail: &captureMailer{}, hub: realtime.NewHub(), mc: mc, app: app}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	e.svc = service.New(&service.Deps{
		Store: st, Hub: e.hub, Mailer: e.mail, Issuer: auth.NewIssuer(testSecret, 12*time.Hour, clock.Now), Hasher: testHasher,
		Limiter: auth.NewLimiter(clock.Now), Logger: logger, BaseURL: testBaseURL, ExposeDevLinks: true,
	})
	static := t.TempDir()
	_ = os.MkdirAll(filepath.Join(static, "assets"), 0o755)
	_ = os.WriteFile(filepath.Join(static, "index.html"), []byte("<html>traackly</html>"), 0o600)
	_ = os.WriteFile(filepath.Join(static, "assets", "app.js"), []byte("console.log(1)"), 0o600)
	e.srv = httptest.NewServer(httpapi.NewRouter(e.svc, httpapi.Options{StaticDir: static, Logger: logger}))
	t.Cleanup(e.srv.Close)
	e.authz, err = seed.EnsureAccount(ctx, st, testHasher, &seed.Account{
		Name: "Founder's Office", Email: authzEmail, Password: authzPass, Role: domain.RoleAuthorizer,
	})
	if err != nil {
		t.Fatal(err)
	}
	return e
}

// client is a browser-like HTTP client with its own cookie jar.
type client struct {
	e  *env
	hc *http.Client
}

func (e *env) anon() *client {
	jar, _ := cookiejar.New(nil)
	return &client{e: e, hc: &http.Client{Jar: jar}}
}

func (e *env) login(email, password string) *client {
	e.t.Helper()
	c := e.anon()
	if code := c.call(http.MethodPost, "/api/auth/login", map[string]string{"email": email, "password": password}, nil); code != http.StatusOK {
		e.t.Fatalf("login %s: %d", email, code)
	}
	return c
}

// user creates an active account directly and logs it in.
func (e *env) user(name string, role domain.Role, dept domain.Department) (*client, *domain.User) {
	e.t.Helper()
	email := strings.ToLower(strings.ReplaceAll(name, " ", ".")) + "@ncbp.in"
	u, err := seed.EnsureAccount(context.Background(), e.st, testHasher, &seed.Account{
		Name: name, Email: email, Password: "password1", Role: role, Department: dept,
	})
	if err != nil {
		e.t.Fatal(err)
	}
	return e.login(email, "password1"), u
}

type apiError struct {
	Error struct {
		Code    string            `json:"code"`
		Message string            `json:"message"`
		Fields  map[string]string `json:"fields"`
	} `json:"error"`
}

// call performs a JSON request and decodes the response into out (if non-nil).
func (c *client) call(method, path string, in, out any) int {
	c.e.t.Helper()
	var body io.Reader
	if in != nil {
		b, _ := json.Marshal(in)
		body = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, c.e.srv.URL+path, body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.hc.Do(req)
	if err != nil {
		c.e.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, _ := io.ReadAll(resp.Body)
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			c.e.t.Fatalf("%s %s: decode %q: %v", method, path, raw, err)
		}
	}
	return resp.StatusCode
}

// fail calls and returns the decoded error envelope, asserting the status.
func (c *client) fail(method, path string, in any, status int) apiError {
	c.e.t.Helper()
	var ae apiError
	if code := c.call(method, path, in, &ae); code != status {
		c.e.t.Fatalf("%s %s: want %d, got %d (%+v)", method, path, status, code, ae)
	}
	return ae
}

type reqDTO struct {
	ID                 string `json:"id"`
	JobCode            string `json:"jobCode"`
	ClientName         string `json:"clientName"`
	RequirementDetails string `json:"requirementDetails"`
	TargetDepartment   string `json:"targetDepartment"`
	Priority           string `json:"priority"`
	State              string `json:"state"`
	RaisedBy           struct {
		Name string `json:"name"`
	} `json:"raisedBy"`
	DeclineReason *string `json:"declineReason"`
	Timeline      *struct {
		Estimate time.Time `json:"estimate"`
		SetBy    struct {
			Name string `json:"name"`
		} `json:"setBy"`
	} `json:"timeline"`
	Changelog []struct {
		Field     string `json:"field"`
		OldValue  string `json:"oldValue"`
		NewValue  string `json:"newValue"`
		ChangedBy struct {
			Name string `json:"name"`
		} `json:"changedBy"`
	} `json:"changelog"`
	StatusHistory []struct {
		To    string `json:"to"`
		Actor string `json:"actor"`
	} `json:"statusHistory"`
	PendingAcks  []string `json:"pendingAcks"`
	Acknowledged *struct {
		By string `json:"by"`
	} `json:"acknowledged"`
	FloorBlocker string `json:"floorBlocker"`
	Risk         struct {
		AtRisk  bool     `json:"atRisk"`
		Reasons []string `json:"reasons"`
	} `json:"risk"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type reqEnvelope struct {
	Request    reqDTO `json:"request"`
	NextOwners string `json:"nextOwners"`
}

type listEnvelope struct {
	Requests []reqDTO `json:"requests"`
}

func (c *client) request(path string) reqDTO {
	c.e.t.Helper()
	var out reqEnvelope
	if code := c.call(http.MethodGet, path, nil, &out); code != http.StatusOK {
		c.e.t.Fatalf("GET %s: %d", path, code)
	}
	return out.Request
}

func (c *client) list(path string) []reqDTO {
	c.e.t.Helper()
	var out listEnvelope
	if code := c.call(http.MethodGet, path, nil, &out); code != http.StatusOK {
		c.e.t.Fatalf("GET %s: %d", path, code)
	}
	return out.Requests
}

func (c *client) post(path string, in any) reqEnvelope {
	c.e.t.Helper()
	var out reqEnvelope
	if code := c.call(http.MethodPost, path, in, &out); code != http.StatusOK && code != http.StatusCreated {
		c.e.t.Fatalf("POST %s: %d", path, code)
	}
	return out
}

func railwayOrder() map[string]any {
	return map[string]any{
		"clientName":         "Indian Railways",
		"requirementDetails": "Brush holders BH-40, 40mm",
		"targetDepartment":   "production",
		"priority":           "urgent",
	}
}

func (e *env) future(days int) string {
	return e.clock.Now().Add(time.Duration(days) * 24 * time.Hour).Format(time.RFC3339)
}
