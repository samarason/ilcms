.PHONY: help hosts k3s-models k3s-test k3s-status clean
#.PHONY: help hosts dev-up dev-down k3s-import k3s-install k3s-models k3s-test k3s-status clean

help:
#	@echo "make hosts | k3s-import | k3s-install | k3s-models | k3s-test | k3s-status"
	@echo "make hosts | | k3s-models | k3s-test | k3s-status | clean"

hosts:
	@grep -q "ilcms.local" /etc/hosts || echo "127.0.0.1 ilcms.local auth.ilcms.local" | sudo tee -a /etc/hosts

#dev-up:
#	docker compose up -d

#dev-down:
#	docker compose down

#k3s-import:
#	./scripts/k3s-import-images.sh

#k3s-install:
	#helm upgrade --install ilcms deploy/helm/ilcms --namespace ilcms --create-namespace --wait --timeout 10m

k3s-models:
	kubectl exec -n ilcms ilcms-ollama-0 -- ollama pull bge-m3
	kubectl exec -n ilcms ilcms-ollama-0 -- ollama pull llama3:latest

k3s-test:
	./scripts/k3s-smoke-test.sh

k3s-status:
	kubectl get pods,svc,ingress,pvc -n ilcms

clean:
	helm uninstall ilcms -n ilcms || true

