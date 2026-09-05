---
description: Crea un git worktree en .trees/[nombre] y ejecuta la tarea indicada ahí, aislada del código principal
argument-hint: <descripción de la tarea a realizar en el worktree>
allowed-tools: Bash(git worktree:*), Bash(git branch:*), Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git diff:*)
---

# /worktree

Tarea solicitada por el usuario:

$ARGUMENTS

## Pasos

1. **Determinar el nombre del worktree.** Derívalo del requerimiento anterior: en kebab-case, en minúsculas, sin acentos ni espacios, máximo 3 palabras (por ejemplo `hold-piece`, `sonidos`, `fix-rotacion`). Si ya existe `.trees/[nombre]` o una rama con ese nombre, agrega un sufijo numérico (`-2`, `-3`, ...).

2. **Crear el worktree y su rama** a partir de la rama actual:

   ```bash
   git worktree add .trees/[nombre] -b [nombre]
   ```

   Si `.trees/` no está en `.gitignore`, agrégalo.

3. **Trabajar únicamente dentro de `.trees/[nombre]`.** Todo lo que pida la tarea (leer, editar, crear archivos, ejecutar comandos) se hace sobre rutas dentro de ese directorio. No toques ningún archivo fuera de él; el árbol principal debe quedar intacto.

4. **Cumplir la tarea completa** siguiendo las convenciones de `CLAUDE.md` (vanilla JS, sin bundler, textos de la UI en español, mantener sincronizados canvas/ids/localStorage).

5. **Confirmar el trabajo** con uno o más commits dentro del worktree:

   ```bash
   git -C .trees/[nombre] add -A
   git -C .trees/[nombre] commit -m "<mensaje>"
   ```

6. **Reportar al usuario**, en español y de forma breve:
   - ruta del worktree y nombre de la rama,
   - resumen de los cambios y archivos tocados,
   - cómo probarlo (`python3 -m http.server 8000` dentro del worktree),
   - comando para integrar cuando esté listo: `git merge [nombre]` desde la rama principal, y para limpiar: `git worktree remove .trees/[nombre]` y `git branch -d [nombre]`.

No hagas merge a la rama principal ni elimines el worktree a menos que el usuario lo pida.
