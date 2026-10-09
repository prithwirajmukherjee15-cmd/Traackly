// Package httpapi exposes Traackly's REST and WebSocket API.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/prithwirajmukherjee15-cmd/traackly/server/apperrors"
)

const maxBodyBytes = 64 << 10

type errorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (a *API) writeError(w http.ResponseWriter, r *http.Request, err error) {
	ae, ok := apperrors.As(err)
	if !ok {
		ae = apperrors.NewServer(err.Error())
	}
	if ae.Blame != apperrors.BlameClient {
		a.logger.ErrorContext(r.Context(), "request failed", "error", err, "path", r.URL.Path)
	}
	writeJSON(w, ae.StatusCode, errorEnvelope{Error: errorBody{Code: ae.Code, Message: ae.UserMessage, Fields: ae.Fields}})
}

// decode reads a JSON body into dst, rejecting unknown fields and oversized bodies.
func decode(w http.ResponseWriter, r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil && !errors.Is(err, io.EOF) {
		return apperrors.NewClient("Request body is not valid JSON for this endpoint")
	}
	return nil
}

func pathID(r *http.Request, name string) (bson.ObjectID, error) {
	id, err := bson.ObjectIDFromHex(chi.URLParam(r, name))
	if err != nil {
		return bson.ObjectID{}, apperrors.NewNotFound("Not found")
	}
	return id, nil
}

type okResponse struct {
	OK bool `json:"ok"`
}

func writeOK(w http.ResponseWriter) { writeJSON(w, http.StatusOK, okResponse{OK: true}) }
