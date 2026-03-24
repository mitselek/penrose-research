# Shechtman — Scratchpad

## 2026-03-24

[LEARNED] Speed bug fix TDD: only 1 test in signals.test.ts directly asserted the old `/ conduit.length` formula (line 141, moveSignals). The other moveSignals tests (dir=-1 toward 0, dir=+1 toward 1, zero dt, empty array) use relative assertions that don't depend on the exact formula.

[DECISION] Updated test description to "advances position by dir \* speed \* dt (fraction of conduit per ms)" to document the new semantic meaning of speed.
