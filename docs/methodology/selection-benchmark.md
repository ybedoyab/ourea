# Selection benchmark

Ourea can compare three reproducible selection rules under the same budget and comparison seed:

1. **Hazard-only** — greedy placement on mapped high-hazard exposure.
2. **Deterministic central scenario** — one frozen development scenario, no uncertainty ensemble.
3. **Ourea robust** — the published uncertainty ensemble and named policy profile.

The comparison reports budget feasibility, median and lower-tail (P10) benefit proxies, project overlap with the robust plan, P10 regret versus robust, and equity/access proxies where the model already computes them.

## What breaks this portfolio?

A deterministic sensitivity grid varies rainfall, antecedent wetness and restoration-maturity year. It reports:

- scenario cells below 80% of the reference benefit proxy;
- which published assumptions move the proxy most;
- rainfall values that change the robust recommendation;
- the gap versus a named alternative plan.

This is not a calibrated climate forecast and not machine-learning scenario discovery.

Neither benchmark nor sensitivity consumes community-evidence records.
