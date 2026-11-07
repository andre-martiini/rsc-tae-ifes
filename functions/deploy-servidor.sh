#!/usr/bin/env bash
# Empacota functions/servidor.ts e publica a Cloud Function consultarServidorBase (gen2, sem chave).
set -euo pipefail
cd "$(dirname "$0")/.."
out=$(mktemp -d)
npx esbuild functions/servidor.ts --bundle --platform=node --target=node22 --format=esm --outfile="$out/index.js"
echo '{"type":"module","main":"index.js","engines":{"node":"22"},"dependencies":{"@google-cloud/functions-framework":"^4.0.0"}}' > "$out/package.json"
gcloud functions deploy consultarServidorBase --gen2 --project=comissao-rsc-tae --region=us-central1 \
  --runtime=nodejs22 --trigger-http --allow-unauthenticated --entry-point=consultarServidorBase \
  --service-account=rsc-servidor-lookup@comissao-rsc-tae.iam.gserviceaccount.com \
  --max-instances=2 --cpu=1 --memory=256Mi --concurrency=40 --source="$out" --quiet
rm -rf "$out"
