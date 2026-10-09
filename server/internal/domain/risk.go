package domain

import (
	"strconv"
	"time"
)

// Risk thresholds for the v1 rule-based anomaly flag (TRD Section 7).
const (
	riskEditThreshold    = 2
	defaultUnackedWindow = 48 * time.Hour
	qaUnackedWindow      = 24 * time.Hour
)

// Risk is the advisory "likely to stall" assessment. It never gates the core mechanic.
type Risk struct {
	AtRisk  bool
	Reasons []string
}

// UnackedWindow returns how long a department may leave a change unacknowledged before it is at risk.
func UnackedWindow(d Department) time.Duration {
	if d == DeptQA {
		return qaUnackedWindow
	}
	return defaultUnackedWindow
}

// AssessRisk applies the deterministic v1 heuristic: two or more post-authorization
// edits, or an updated request left unacknowledged past its department's window.
func AssessRisk(r *Request, now time.Time) Risk {
	if r.State.IsTerminal() {
		return Risk{Reasons: []string{}}
	}
	reasons := []string{}
	if n := r.EditEvents(); n >= riskEditThreshold {
		reasons = append(reasons, "Edited "+strconv.Itoa(n)+" times after authorization")
	}
	if last, ok := r.LastChange(); ok && r.State == StateUpdated {
		window := UnackedWindow(r.TargetDepartment)
		if now.Sub(last.ChangedAt) > window {
			reasons = append(reasons, "Change unacknowledged for over "+strconv.Itoa(int(window.Hours()))+"h")
		}
	}
	return Risk{AtRisk: len(reasons) > 0, Reasons: reasons}
}
