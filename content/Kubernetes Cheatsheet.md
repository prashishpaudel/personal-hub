---
title: Kubernetes Cheatsheet
date: 2026-05-10
tags: [kubernetes, k8s, tools, devops]
---

# Kubernetes Cheatsheet

## Cluster & Context

```bash
kubectl cluster-info                # cluster endpoint
kubectl get nodes                   # list nodes
kubectl config get-contexts         # list contexts
kubectl config use-context <name>   # switch context
kubectl config current-context      # show active context
```

## Apply Configs

```bash
kubectl apply -f file.yaml          # create/update from manifest
kubectl apply -f ./dir/             # apply all manifests in dir
kubectl delete -f file.yaml         # delete from manifest
```

Typical order for a fresh app:
```bash
kubectl apply -f namespace.yaml
kubectl apply -f rbac.yaml
kubectl apply -f pv.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

---

## Pods

```bash
kubectl get pods                              # default namespace
kubectl get pods -n <namespace>               # specific namespace
kubectl get pods -A                           # all namespaces
kubectl get pods -o wide                      # with IP, node, age
kubectl get pod <name> -n <ns> -w             # watch in real-time
kubectl describe pod <name> -n <ns>           # full details + events
kubectl delete pod <name> -n <ns>             # delete pod
kubectl delete pods --all -n <ns>             # nuke all pods in ns
```

## Logs

```bash
kubectl logs <pod> -n <ns>                    # full logs
kubectl logs <pod> -n <ns> -f                 # follow (tail)
kubectl logs <pod> -n <ns> --previous         # logs from prior crash
kubectl logs <pod> -c <container> -n <ns>     # specific container
```

## Exec into Pod

```bash
kubectl exec -it <pod> -n <ns> -- bash        # shell
kubectl exec <pod> -n <ns> -- ls /app         # one-off command
```

## Copy Files

```bash
kubectl cp ./local.py <ns>/<pod>:/app/file.py   # local → pod
kubectl cp <ns>/<pod>:/app/file.py ./local.py   # pod → local
```

---

## Services & Networking

```bash
kubectl get services -n <ns>                  # list services
kubectl get svc -n <ns>                       # short form
kubectl describe svc <name> -n <ns>           # details
```

### Port Forwarding (debug only)

```bash
kubectl port-forward svc/<service> -n <ns> 8080:80
kubectl port-forward svc/<service> -n <ns> 8080:80 --address 0.0.0.0
```

### Ingress

```bash
kubectl get ingress -n <ns>
kubectl get pods -n ingress-nginx             # ingress controller pods
```

---

## Deployments

```bash
kubectl get deployments -n <ns>
kubectl rollout status deployment/<name> -n <ns>     # check rollout
kubectl rollout restart deployment/<name> -n <ns>    # rolling restart
kubectl rollout undo deployment/<name> -n <ns>       # rollback
kubectl scale deployment/<name> --replicas=3 -n <ns>
kubectl delete deployments --all -n <ns>             # nuke all
```

---

## Storage

```bash
kubectl get pv                                # persistent volumes
kubectl get pvc -n <ns>                       # persistent volume claims
kubectl delete pv <name>                      # delete PV
```

---

## Namespaces

```bash
kubectl get ns                                # list namespaces
kubectl create ns <name>                      # create
kubectl delete ns <name>                      # delete (removes everything inside)
```

---

## See Everything

```bash
kubectl get all -n <ns>                       # pods, services, deployments, etc
kubectl get events -n <ns> --sort-by=.lastTimestamp
```

---

## Cleanup Patterns

```bash
kubectl delete services --all -n <ns>
kubectl delete deployments --all -n <ns>
kubectl delete pods --all -n <ns>
kubectl delete namespace <ns>                 # nuclear option
```

---

## YAML Quick Reference

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:latest
          ports:
            - containerPort: 80
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: my-app
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```
