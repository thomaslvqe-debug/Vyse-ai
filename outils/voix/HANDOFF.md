# Handoff : voix off des Reels Vyse

Pour l'agent Instagram qui fabrique les Reels de projet_vyse_ai. Première utilisation : Reel « Storytime : pourquoi j'ai créé Vyse » (`reels/vyse-storytime-fondateur.mp4`, novembre 2026).

## Moteur retenu

**Chatterbox Multilingual** (Resemble AI), modèle open source sous **licence MIT** : usage commercial autorisé, gratuit, tourne sur CPU.

À ne pas utiliser pour les Reels :
- **ElevenLabs gratuit** : pas de licence commerciale, attribution obligatoire.
- **XTTS-v2, F5-TTS** : licences non commerciales.
- **Voix Microsoft (edge-tts)** : passe par WebSocket, bloqué par le proxy de l'environnement cloud.
- **Piper** (`fr_FR-tom-medium`) : fonctionne, mais voix trop robotique. Sert seulement de timbre de référence (voir plus bas).

## Installation (environnement cloud, 2 CPU, ~7 Go de RAM)

```bash
python3 -m venv cbx
./cbx/bin/pip install chatterbox-tts faster-whisper   # tire torch 2.6, ~quelques Go
```
Le premier lancement télécharge les poids depuis Hugging Face (~45 s de chargement). Compter **~40 s par phrase** générée sur CPU : lancer les lots en arrière-plan (`nohup … &`) pour ne pas dépasser le délai de 10 min d'une commande.

## Fichiers

| Fichier | Rôle |
|---|---|
| `generer_voix.py` | Génère une liste de phrases à partir d'un JSON de jobs |
| `verifier_voix.py` | Retranscrit les WAV avec Whisper (small, CPU) pour vérifier la prononciation |
| `voix_reference.wav` | Clip de 8 s qui fixe le timbre (voix masculine « étudiant ») ; à réutiliser pour garder la même voix d'un Reel à l'autre |

Format des jobs (`jobs.json`) :
```json
[{"text": "Petite histoire : pourquoi j'ai créé une application de révision.",
  "out": "l0_t1.wav", "ref": "outils/voix/voix_reference.wav", "ex": 0.55, "cfg": 0.5}]
```
```bash
./cbx/bin/python outils/voix/generer_voix.py jobs.json
./cbx/bin/python outils/voix/verifier_voix.py l0_t1.wav l0_t2.wav
```

## Réglages validés par Thomas

- `language_id='fr'`, `exaggeration=0.55`, `cfg_weight=0.5`, `temperature=0.8`, référence = `voix_reference.wav`.
- **Ne pas utiliser la voix par défaut** (sans référence) : en français elle part en anglais à la fin de certaines phrases.
- Post-traitement de chaque phrase (rendu « tonique » validé) :
  ```
  ffmpeg -i in.wav -af "loudnorm=I=-18:TP=-2,aresample=44100,silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.22:stop_threshold=-42dB:stop_silence=0.14,atempo=1.12" out.wav
  ```
  soit voix +12 % plus rapide sans changer la hauteur, silences internes raccourcis.
- Montage : 0,05 s avant la première phrase d'un plan, 0,12 s après, 0,12 à 0,18 s entre deux phrases d'un même plan. Mix final autour de −19 dB de volume moyen (`volume=4.5dB,alimiter=limit=0.89`), comme les autres Reels.

## Règles de prononciation (Thomas y tient)

1. **Toujours générer 2 prises par phrase**, puis les retranscrire avec `verifier_voix.py` et garder celle dont le texte revient exact. Rien ne part sans cette vérification.
2. **« Vyse » n'est jamais prononcé** : la bonne prononciation n'est pas fixée. Le nom apparaît seulement à l'écran.
3. **« appli » → écrire « application »** (sinon entendu « appui »).
4. **« QCM » → écrire « Q.C.M. »** dans le texte envoyé au modèle.
5. **Pas d'anglicismes à l'oral** : « Storytime » est dit « Petite histoire » (le mot anglais reste à l'écran).
6. **Pas de phrases trop courtes isolées** (« page blanche. » seul est inaudible) : les regrouper avec la phrase voisine, puis couper le WAV au besoin en s'aidant des horodatages mot à mot de Whisper.
7. Après le mix complet, retranscrire le WAV final une dernière fois pour vérifier qu'aucune phrase n'a sauté.

## Limites

- Whisper peut mal retranscrire un mot bien prononcé (« les fait » lu « l'est fait ») : en cas de doute, comparer avec la prise isolée et signaler le mot à Thomas plutôt que de régénérer sans fin.
- L'agent ne peut pas écouter : toujours demander à Thomas d'écouter avant publication, et lui envoyer les extraits avant/après quand on change de voix.
