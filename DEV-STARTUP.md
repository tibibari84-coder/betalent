# BeTalent dev server – automatikus indítás Mac-on

Ha szeretnéd, hogy a dev szerver magától induljon Mac bekapcsoláskor:

## 1. Telepítés (egyszer)

Terminalban futtasd:

```bash
cp /Applications/MAMP/htdocs/betalent/com.betalent.dev.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.betalent.dev.plist
```

## 2. Indítás / leállítás

- **Indítás:** `launchctl load ~/Library/LaunchAgents/com.betalent.dev.plist`
- **Leállítás:** `launchctl unload ~/Library/LaunchAgents/com.betalent.dev.plist`
- **Újraindítás:** Először unload, majd load.

## 3. Naplók

- Kimenet: `/tmp/betalent-dev.log`
- Hibák: `/tmp/betalent-dev.err`
- Megtekintés: `tail -f /tmp/betalent-dev.log`

## 4. Kikapcsolás

```bash
launchctl unload ~/Library/LaunchAgents/com.betalent.dev.plist
```
