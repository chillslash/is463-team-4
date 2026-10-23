# Model evaluation

The ranking review remains provisional pending CoffeeBot's decisions on fees, transport, capacity and grounds compatibility.

The branch implements a 36-prospect, six-source evidence-tier benchmark with held-out cases, covering rules-only, Codex, Qwen and Llama. Labels measure source specificity, not actual partner acceptance. It is a read-only evaluation and does not change Saved partners.

Run: `node scripts/ranking-benchmark.mjs --models=rules,codex,qwen,llama` with the saved discovery snapshot, authenticated Codex CLI and local Ollama models available. Do not select a winner without full results and a manual hallucination check. Runtime and tokens are not energy or emissions estimates.
