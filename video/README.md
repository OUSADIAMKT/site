# Vídeos de fundo

A hero da home espera dois arquivos aqui:

- `hero.mp4` — H.264 / AAC (ou sem áudio, o vídeo toca mudo mesmo).
- `hero-poster.jpg` — primeiro frame; aparece antes do vídeo carregar e
  substitui o vídeo para quem usa "reduzir movimento" no sistema.

Opcional: `hero.webm` (VP9), passado em `webm={...}` — costuma ficar ~30%
menor e o navegador escolhe ele primeiro.

## Como exportar

Loop de 8–15s, sem áudio, 1920x1080, mirando **até 3 MB**:

```bash
ffmpeg -i original.mov -t 12 -an -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -crf 28 -preset slow -movflags +faststart hero.mp4

ffmpeg -i hero.mp4 -vframes 1 -q:v 3 hero-poster.jpg
```

`-movflags +faststart` é o que faz o vídeo começar a tocar antes de baixar
inteiro. Sem ele a hero fica preta nos primeiros segundos.

Regra do PRD (7.3): imagem real da Ousadia. Nada de banco de imagens.
