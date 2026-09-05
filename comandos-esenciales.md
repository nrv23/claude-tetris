# Comandos esenciales — Terminal, Git, Docker y Claude Code

> Cheatsheet con ejemplos reales y notas de advertencia.
> Convención: `<algo>` = reemplazar por tu valor. ⚠️ = comando destructivo o difícil de deshacer.

---

## Tabla de contenido

1. [Terminal / Linux (bash)](#1-terminal--linux-bash)
2. [Git](#2-git)
3. [GitHub CLI (`gh`)](#3-github-cli-gh)
4. [Docker](#4-docker)
5. [Claude Code / Cowork](#5-claude-code--cowork)
6. [Combos que uso todos los días](#6-combos-que-uso-todos-los-días)

---

## 1. Terminal / Linux (bash)

### 1.1 Navegación

| Comando | Qué hace |
|---|---|
| `pwd` | Muestra la ruta actual |
| `ls -lah` | Lista todo, con tamaños legibles y archivos ocultos |
| `cd -` | Vuelve al directorio anterior |
| `cd ~` | Va a tu carpeta home |
| `tree -L 2` | Árbol de carpetas hasta 2 niveles (instalar: `apt install tree`) |

```bash
ls -lah                    # todo, incluidos ocultos (.env, .git...)
ls -lt | head              # los 10 archivos modificados más recientemente
cd ../..                   # sube dos niveles
```

> **Nota:** `cd -` es el atajo más subestimado del shell. Alterna entre dos carpetas como un `Alt+Tab`.

---

### 1.2 Archivos y carpetas

```bash
mkdir -p proyecto/src/utils      # crea toda la ruta de una vez
touch archivo.txt                # crea vacío o actualiza la fecha
cp -r origen/ destino/           # copia recursiva de carpetas
mv viejo.txt nuevo.txt           # renombra (o mueve)
rm archivo.txt                   # borra archivo
rm -rf carpeta/                  # ⚠️ borra carpeta y todo su contenido
ln -s /ruta/real enlace          # enlace simbólico
```

> ⚠️ **`rm -rf` no tiene papelera.** Nunca lo combines con variables sin comprobarlas:
> `rm -rf "$DIR"/` con `$DIR` vacío borra desde la raíz. Costumbre sana: primero `ls "$DIR"`, luego borra.
> Alternativa segura: instala `trash-cli` y usa `trash archivo`.

---

### 1.3 Leer archivos

```bash
cat archivo.txt                  # todo el contenido
head -n 20 archivo.log           # primeras 20 líneas
tail -n 50 archivo.log           # últimas 50
tail -f app.log                  # 👑 sigue el log en vivo (Ctrl+C para salir)
less archivo.txt                 # visor paginado (q sale, / busca)
wc -l archivo.csv                # cuenta líneas
```

> **`tail -f`** es el comando #1 para depurar servicios. Combínalo: `tail -f app.log | grep ERROR`

---

### 1.4 Buscar

```bash
# Buscar ARCHIVOS por nombre
find . -name "*.log"                     # todos los .log desde aquí
find . -type f -size +100M               # archivos de más de 100 MB
find . -name "node_modules" -type d      # localiza carpetas pesadas

# Buscar TEXTO dentro de archivos
grep -rn "API_KEY" .                     # recursivo, con número de línea
grep -rn --include="*.js" "TODO" src/    # solo en archivos .js
grep -i "error" app.log                  # ignora mayúsculas
grep -v "debug" app.log                  # invierte: líneas SIN "debug"

# ripgrep (rg): más rápido y respeta .gitignore
rg "useState" --type ts
rg -l "console.log"                      # solo nombres de archivo
```

> **Nota:** si trabajas en repos, `rg` (ripgrep) es mucho mejor que `grep -r`: ignora `node_modules` y `.git` automáticamente. Instalar: `apt install ripgrep` o `brew install ripgrep`.

---

### 1.5 Permisos y propietario

```bash
chmod +x script.sh               # hacerlo ejecutable
chmod 644 archivo.txt            # dueño lee/escribe, resto solo lee
chmod 755 carpeta/               # típico para carpetas y ejecutables
chown -R usuario:grupo carpeta/  # cambia dueño recursivamente
```

Números rápidos: `4`=leer, `2`=escribir, `1`=ejecutar. Se suman → `7`=rwx, `6`=rw-, `5`=r-x.

> ⚠️ **Nunca uses `chmod 777`.** Da permiso de escritura a cualquier usuario del sistema. Si algo "solo funciona con 777", el problema real es el propietario (`chown`).

---

### 1.6 Procesos

```bash
ps aux | grep node               # busca procesos de node
top          /  htop             # monitor en vivo (htop es mejor)
kill <PID>                       # termina educadamente (SIGTERM)
kill -9 <PID>                    # ⚠️ mata sin permitir limpieza
pkill -f "vite"                  # mata por nombre/patrón del comando
lsof -i :3000                    # ¿quién está usando el puerto 3000?
```

Recetas frecuentes:

```bash
# Liberar un puerto ocupado
lsof -ti:3000 | xargs kill -9

# Correr algo en segundo plano y desatenderlo
nohup npm run start > salida.log 2>&1 &
```

> **Nota:** `kill -9` no deja que el proceso guarde ni cierre conexiones. Prueba `kill` normal primero; usa `-9` solo si se quedó colgado.

---

### 1.7 Disco y sistema

```bash
df -h                            # espacio libre por disco
du -sh *                         # tamaño de cada carpeta aquí
du -sh * | sort -rh | head -10   # top 10 carpetas más pesadas
free -h                          # memoria RAM
uname -a                         # info del sistema
uptime                           # tiempo encendido y carga
```

---

### 1.8 Red

```bash
curl https://api.ejemplo.com/status
curl -I https://midominio.com                 # solo headers
curl -X POST -H "Content-Type: application/json" \
     -d '{"name":"test"}' https://api.com/x   # POST con JSON
curl -o archivo.zip https://.../archivo.zip   # descargar
wget -c https://.../grande.iso                # descarga reanudable
ping -c 4 google.com
dig midominio.com +short                      # resolver DNS
ssh usuario@servidor.com
scp archivo.txt usuario@servidor:/ruta/       # copiar por SSH
rsync -avz --progress local/ user@host:/dest/ # sincronizar (mejor que scp)
```

> **Nota:** `rsync` solo transfiere lo que cambió y se puede reanudar. Para deploys manuales es muy superior a `scp`.
> ⚠️ En `rsync`, la barra final importa: `local/` copia *el contenido*; `local` copia *la carpeta*.

---

### 1.9 Comprimir

```bash
tar -czf backup.tar.gz carpeta/      # comprimir (c=crear z=gzip f=archivo)
tar -xzf backup.tar.gz               # extraer
tar -tzf backup.tar.gz               # ver contenido sin extraer
zip -r sitio.zip sitio/
unzip sitio.zip -d destino/
```

Mnemotecnia: **c**reate, e**x**tract, lis**t** — siempre con `zf`.

---

### 1.10 Tuberías y trucos

```bash
comando | grep patrón            # filtrar salida
comando > archivo.txt            # ⚠️ sobrescribe
comando >> archivo.txt           # añade al final
comando 2>&1 | tee log.txt       # ver en pantalla Y guardar (con errores)
history | grep docker            # buscar en tu historial
!!                               # repite el último comando
sudo !!                          # repite el último comando con sudo
Ctrl+R                           # búsqueda interactiva en el historial
Ctrl+C / Ctrl+D                  # cancelar / cerrar sesión
```

> **`Ctrl+R`** es el mayor ahorro de tiempo del shell: escribe 3 letras de un comando viejo y aparece.

---

## 2. Git

### 2.1 Día a día

```bash
git status                       # el comando que más usarás
git add .                        # prepara todos los cambios
git add -p                       # 👑 prepara por trozos, revisando cada uno
git commit -m "feat: login"      # confirma
git commit --amend               # ⚠️ corrige el último commit (no si ya lo subiste)
git push                         # sube
git pull --rebase                # baja y reaplica tus commits encima (historial limpio)
git log --oneline --graph -20    # historial visual compacto
git diff                         # cambios sin preparar
git diff --staged                # cambios ya preparados
```

> **`git add -p`** te obliga a revisar lo que subes. Es el mejor filtro contra subir un `console.log` o una API key por accidente.

---

### 2.2 Ramas

```bash
git branch                       # listar locales
git switch -c feature/login      # crear y cambiar (moderno)
git checkout -b feature/login    # lo mismo (clásico)
git switch main                  # cambiar de rama
git branch -d feature/login      # borrar rama ya fusionada
git branch -D feature/login      # ⚠️ borrar a la fuerza
git merge feature/login          # fusionar en la rama actual
git rebase main                  # ⚠️ reescribe tus commits sobre main
```

> ⚠️ **Regla de oro del rebase:** nunca hagas rebase de una rama que otros ya descargaron. Reescribe el historial y rompe el repo de tus compañeros. En tu rama personal antes del PR: perfecto.

---

### 2.3 Deshacer cosas

```bash
git restore archivo.txt              # descarta cambios locales del archivo
git restore --staged archivo.txt     # quita del área de preparación
git reset --soft HEAD~1              # deshace el commit, conserva los cambios
git reset --hard HEAD~1              # ⚠️ deshace commit Y cambios (se pierden)
git revert <hash>                    # crea un commit que revierte otro (seguro)
git stash                            # guarda cambios temporalmente
git stash pop                        # los recupera
git stash list                       # ver lo guardado
git reflog                           # 🛟 historial de TODO, incluso lo "borrado"
```

> 🛟 **`git reflog` te salva la vida.** Si hiciste `reset --hard` por error, busca ahí el hash anterior y haz `git reset --hard <hash>`. Git casi nunca borra de verdad durante ~30 días.
> **`revert` vs `reset`:** en ramas compartidas usa siempre `revert`. `reset` reescribe historial.

---

### 2.4 Remotos e inspección

```bash
git remote -v                        # ver remotos
git remote add origin <url>
git push -u origin main              # primer push, fija el upstream
git fetch --all --prune              # actualiza refs y limpia ramas borradas
git clone <url> --depth 1            # clon superficial (rápido, sin historial)
git blame archivo.js                 # quién escribió cada línea
git show <hash>                      # ver un commit completo
git log -S "función" --oneline       # busca commits que tocaron ese texto
```

---

### 2.5 Configuración inicial

```bash
git config --global user.name "Nataniel Rodríguez"
git config --global user.email "nrodriguez@hardcod3.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global alias.lg "log --oneline --graph --all -20"
```

---

## 3. GitHub CLI (`gh`)

```bash
gh auth login                        # autenticarse
gh repo clone owner/repo
gh repo create mi-proyecto --private --source=. --push
gh pr create --title "Login" --body "Descripción"
gh pr list                           # PRs abiertos
gh pr checkout 42                    # revisar el PR #42 localmente
gh pr view --web                     # abrir en el navegador
gh pr merge 42 --squash --delete-branch
gh issue create --title "Bug en login"
gh issue list --assignee @me
gh run list                          # estado de GitHub Actions
gh run watch                         # seguir un workflow en vivo
```

> **Nota:** `gh pr checkout <n>` es la forma más rápida de revisar el código de alguien: te deja la rama del PR lista sin configurar remotos.

---

## 4. Docker

### 4.1 Contenedores

```bash
docker ps                            # contenedores corriendo
docker ps -a                         # incluye los detenidos
docker run -d -p 8080:80 --name web nginx
docker stop web  /  docker start web
docker restart web
docker rm web                        # borrar contenedor detenido
docker logs -f web                   # 👑 seguir logs en vivo
docker exec -it web bash             # 👑 entrar a un contenedor
docker stats                         # uso de CPU/RAM en vivo
```

Flags clave de `run`:

| Flag | Significado |
|---|---|
| `-d` | Segundo plano (detached) |
| `-p 8080:80` | Puerto host:contenedor |
| `-v $(pwd):/app` | Monta carpeta local |
| `-e VAR=valor` | Variable de entorno |
| `--rm` | Se borra solo al terminar |
| `-it` | Interactivo con terminal |

---

### 4.2 Imágenes

```bash
docker images
docker build -t miapp:1.0 .
docker build --no-cache -t miapp:1.0 .     # ignora la caché
docker pull node:20-alpine
docker rmi miapp:1.0                        # borrar imagen
docker tag miapp:1.0 registro.com/miapp:1.0
docker push registro.com/miapp:1.0
```

---

### 4.3 Docker Compose

```bash
docker compose up -d                 # levantar todo en segundo plano
docker compose up --build            # reconstruir y levantar
docker compose down                  # detener y eliminar contenedores
docker compose down -v               # ⚠️ también borra los volúmenes (¡datos!)
docker compose logs -f api           # logs de un servicio
docker compose ps
docker compose exec api sh           # shell dentro de un servicio
docker compose restart api
```

> ⚠️ **`docker compose down -v` borra tus volúmenes**, o sea la base de datos del entorno local. Si querías solo apagar, usa `docker compose down` a secas o `stop`.

---

### 4.4 Limpieza

```bash
docker system df                     # cuánto espacio ocupa Docker
docker system prune                  # borra lo no usado (contenedores, redes, caché)
docker system prune -a --volumes     # ⚠️ borra TODO lo no usado, volúmenes incluidos
docker volume ls
docker image prune -a
```

> **Nota:** Docker se come el disco silenciosamente. `docker system df` primero, `prune` después. La variante `-a --volumes` puede borrar datos que creías persistentes.

---

## 5. Claude Code / Cowork

### 5.1 Slash commands frecuentes

| Comando | Qué hace |
|---|---|
| `/help` | Lista de comandos disponibles |
| `/rewind` | 👑 Vuelve a un checkpoint anterior: restaura código **y** conversación |
| `/clear` | Limpia el contexto de la conversación |
| `/compact` | Resume el contexto para liberar tokens |
| `/resume` | Retomar una sesión anterior |
| `/config` | Ajustes de la sesión |
| `/model` | Cambiar de modelo |
| `/agents` | Crear y gestionar subagentes |
| `/skills` | Ver y gestionar skills |
| `/mcp` | Estado de servidores MCP conectados |
| `/plugin` | Instalar y gestionar plugins |
| `/permissions` | Qué puede hacer Claude sin preguntar |
| `/memory` | Editar el `CLAUDE.md` de memoria |
| `/add-dir` | Añadir otra carpeta al contexto de trabajo |
| `/cost` | Uso de tokens de la sesión |
| `/status` | Estado de la sesión, cuenta y conexiones |
| `/doctor` | Diagnóstico de la instalación |
| `/init` | Genera un `CLAUDE.md` para el proyecto |
| `/review` | Revisión de código |
| `/loop` | Repite una tarea en intervalos |

### `/rewind` — el botón de deshacer

Es el comando que evita desastres cuando Claude tomó un camino equivocado.

- **Atajo:** `Esc` `Esc` (doble Escape).
- **Restaura:** el estado del código *y* el de la conversación hasta el checkpoint elegido.
- **Te deja escoger** qué revertir: solo el código, solo la conversación, o ambos.

> ⚠️ **Lo que `/rewind` NO deshace:** los efectos secundarios de comandos de shell ya ejecutados. Si Claude corrió `rm`, un `migrate`, un `npm publish` o un `git push`, eso ya pasó y sigue pasado. `/rewind` revierte archivos y contexto, no el mundo exterior.
> **Costumbre sana:** commit antes de una tarea grande. Así tienes dos redes: el checkpoint de Claude y el de Git.

### 5.2 CLI

```bash
claude                               # sesión interactiva
claude "arregla el bug del login"    # con prompt inicial
claude -c                            # continuar la última sesión
claude -p "resume este repo"         # modo no interactivo (imprime y sale)
claude mcp list                      # servidores MCP configurados
claude plugin install <nombre>
```

### 5.3 Atajos

| Atajo | Acción |
|---|---|
| `Esc` | Interrumpir a Claude |
| `Esc` `Esc` | Abrir `/rewind` (volver a un checkpoint) |
| `Shift+Tab` | Alternar modo (plan / auto-aceptar) |
| `Ctrl+R` | Ver salida completa de una herramienta |
| `#` al inicio | Guardar una nota en la memoria del proyecto |
| Arrastrar archivo | Adjuntarlo a la conversación |

> **Nota:** `CLAUDE.md` en la raíz del repo es la forma más efectiva de mejorar resultados: convenciones, comandos de build, estructura del proyecto. `/init` lo genera automáticamente.

---

## 6. Combos que uso todos los días

```bash
# Top 10 carpetas más pesadas
du -sh * | sort -rh | head -10

# Matar lo que ocupa el puerto 3000
lsof -ti:3000 | xargs kill -9

# Buscar y reemplazar en todos los archivos de un repo
rg -l "textoViejo" | xargs sed -i 's/textoViejo/textoNuevo/g'

# Contar líneas de código por extensión
find . -name "*.ts" -not -path "*/node_modules/*" | xargs wc -l | tail -1

# Ver logs de errores en vivo
tail -f app.log | grep -i --color "error"

# Limpiar ramas locales ya fusionadas
git branch --merged main | grep -v main | xargs git branch -d

# Deshacer el último commit pero conservar los cambios
git reset --soft HEAD~1

# Ver qué cambió entre tu rama y main
git diff main...HEAD --stat

# Entrar al contenedor de la base de datos
docker compose exec db psql -U postgres

# Reconstruir todo desde cero
docker compose down && docker compose up --build -d
```

---

## Reglas de seguridad (léelas dos veces)

1. **`rm -rf`**: verifica la ruta con `ls` antes. Sin papelera, sin vuelta atrás.
2. **`chmod 777`**: nunca. Arregla el propietario con `chown`.
3. **`git push --force`**: usa `--force-with-lease`; falla si alguien subió algo que tú no tienes.
4. **`git reset --hard`**: si te equivocaste, `git reflog` tiene el hash anterior.
5. **`docker compose down -v`**: borra los volúmenes = borra la base de datos local.
6. **`kill -9`**: último recurso; no deja guardar ni cerrar conexiones.
7. **Redirección `>`**: sobrescribe sin avisar. Si querías añadir, era `>>`.

---

*Cheatsheet generado el 1 de septiembre de 2026.*
