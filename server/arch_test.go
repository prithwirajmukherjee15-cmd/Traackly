package main

import (
	"bufio"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func productionGoFiles(t *testing.T, excludeDirs ...string) []string {
	t.Helper()
	var files []string
	err := filepath.WalkDir(".", func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			for _, ex := range excludeDirs {
				if strings.HasPrefix(path, ex) {
					return filepath.SkipDir
				}
			}
			return nil
		}
		if strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, "_test.go") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk: %v", err)
	}
	return files
}

func scanFileForPattern(t *testing.T, path string, patterns []string) []string {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open %s: %v", path, err)
	}
	defer func() { _ = f.Close() }()
	var hits []string
	scanner := bufio.NewScanner(f)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		if strings.HasPrefix(strings.TrimSpace(line), "//") {
			continue
		}
		for _, p := range patterns {
			if strings.Contains(line, p) {
				hits = append(hits, path+":"+itoa(lineNum)+": "+strings.TrimSpace(line))
			}
		}
	}
	return hits
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}

// TestNoRawEnvAccess: production code must not call os.Getenv/os.Setenv.
func TestNoRawEnvAccess(t *testing.T) {
	files := productionGoFiles(t, "config")
	var v []string
	for _, f := range files {
		v = append(v, scanFileForPattern(t, f, []string{"os.Getenv", "os.Setenv"})...)
	}
	if len(v) > 0 {
		t.Errorf("raw env access. Use the config package:\n%s", strings.Join(v, "\n"))
	}
}

// TestNoPanicInProduction: production code must not call panic().
func TestNoPanicInProduction(t *testing.T) {
	files := productionGoFiles(t)
	var v []string
	for _, f := range files {
		v = append(v, scanFileForPattern(t, f, []string{"panic("})...)
	}
	if len(v) > 0 {
		t.Errorf("panic() in production. Return errors:\n%s", strings.Join(v, "\n"))
	}
}

// TestFileMaxLines: no production .go file may exceed 300 lines.
func TestFileMaxLines(t *testing.T) {
	const maxLines = 300
	for _, path := range productionGoFiles(t) {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		if n := strings.Count(string(data), "\n"); n > maxLines {
			t.Errorf("%s has %d lines (max %d)", path, n, maxLines)
		}
	}
}

// TestExportedHaveDocComments: every exported func/type needs a doc comment.
func TestExportedHaveDocComments(t *testing.T) {
	fset := token.NewFileSet()
	for _, path := range productionGoFiles(t) {
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		for _, decl := range node.Decls {
			switch d := decl.(type) {
			case *ast.FuncDecl:
				if d.Name.IsExported() && d.Doc == nil {
					p := fset.Position(d.Pos())
					t.Errorf("%s:%d: exported func %s missing doc comment", p.Filename, p.Line, d.Name.Name)
				}
			case *ast.GenDecl:
				if d.Tok != token.TYPE {
					continue
				}
				for _, spec := range d.Specs {
					ts, ok := spec.(*ast.TypeSpec)
					if ok && ts.Name.IsExported() && d.Doc == nil {
						p := fset.Position(ts.Pos())
						t.Errorf("%s:%d: exported type %s missing doc comment", p.Filename, p.Line, ts.Name.Name)
					}
				}
			}
		}
	}
}

// TestNoRawSQLStrings: SQL keywords in string literals must be parameterized.
func TestNoRawSQLStrings(t *testing.T) {
	fset := token.NewFileSet()
	keywords := []string{"SELECT ", "INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "CREATE TABLE"}
	markers := []string{"this", "?"}
	var v []string
	for _, path := range productionGoFiles(t) {
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		ast.Inspect(node, func(n ast.Node) bool {
			lit, ok := n.(*ast.BasicLit)
			if !ok || lit.Kind != token.STRING {
				return true
			}
			upper := strings.ToUpper(lit.Value)
			for _, kw := range keywords {
				if !strings.Contains(upper, kw) {
					continue
				}
				safe := false
				for _, m := range markers {
					if strings.Contains(lit.Value, m) {
						safe = true
						break
					}
				}
				if !safe {
					p := fset.Position(lit.Pos())
					v = append(v, p.Filename+":"+itoa(p.Line)+": "+lit.Value)
				}
				break
			}
			return true
		})
	}
	if len(v) > 0 {
		t.Errorf("raw SQL. Use parameterized queries:\n%s", strings.Join(v, "\n"))
	}
}

// TestAllJSONStructsHaveTags: if any field has a json tag, ALL exported fields must.
func TestAllJSONStructsHaveTags(t *testing.T) {
	fset := token.NewFileSet()
	var v []string
	for _, path := range productionGoFiles(t) {
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		ast.Inspect(node, func(n ast.Node) bool {
			st, ok := n.(*ast.StructType)
			if !ok || st.Fields == nil {
				return true
			}
			has := false
			for _, f := range st.Fields.List {
				if f.Tag != nil && strings.Contains(f.Tag.Value, `json:`) {
					has = true
					break
				}
			}
			if !has {
				return true
			}
			for _, f := range st.Fields.List {
				for _, name := range f.Names {
					if name.IsExported() && (f.Tag == nil || !strings.Contains(f.Tag.Value, `json:`)) {
						p := fset.Position(name.Pos())
						v = append(v, p.Filename+":"+itoa(p.Line)+": "+name.Name+" missing json tag")
					}
				}
			}
			return true
		})
	}
	if len(v) > 0 {
		t.Errorf("missing json tags:\n%s", strings.Join(v, "\n"))
	}
}

// TestNoGlobalMutableState: production code must not declare package-level var.
func TestNoGlobalMutableState(t *testing.T) {
	allowList := map[string]map[string]bool{
		"main.go":   {"sqlDriver": true},
		"config.go": {"errInvalidConfig": true},
	}
	fset := token.NewFileSet()
	var v []string
	for _, path := range productionGoFiles(t) {
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		base := filepath.Base(path)
		for _, decl := range node.Decls {
			gd, ok := decl.(*ast.GenDecl)
			if !ok || gd.Tok != token.VAR {
				continue
			}
			for _, spec := range gd.Specs {
				vs, ok := spec.(*ast.ValueSpec)
				if !ok {
					continue
				}
				for _, name := range vs.Names {
					if a, ok := allowList[base]; ok && a[name.Name] {
						continue
					}
					p := fset.Position(name.Pos())
					v = append(v, p.Filename+":"+itoa(p.Line)+": package-level var "+name.Name)
				}
			}
		}
	}
	if len(v) > 0 {
		t.Errorf("global mutable state. Use DI or function-local vars:\n%s", strings.Join(v, "\n"))
	}
}

// TestNoCommentedOutCode: scans for patterns that look like commented-out code.
func TestNoCommentedOutCode(t *testing.T) {
	patterns := []string{"// func ", "// var ", "// type ", "// if ", "// for ", "// return ", "// switch "}
	for _, path := range productionGoFiles(t) {
		f, err := os.Open(path)
		if err != nil {
			t.Fatalf("open %s: %v", path, err)
		}
		scanner := bufio.NewScanner(f)
		lineNum := 0
		for scanner.Scan() {
			lineNum++
			line := strings.TrimSpace(scanner.Text())
			for _, p := range patterns {
				if strings.HasPrefix(line, p) {
					t.Errorf("%s:%d: commented-out code: %s", path, lineNum, line)
				}
			}
		}
		_ = f.Close()
	}
}
