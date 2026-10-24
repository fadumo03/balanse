# Utviklingslogg – Balanse

Denne loggen viser hvordan appen ble til med vibe coding i Claude Code, fra første idé til dagens versjon.
For hver versjon står det hva jeg ba om, hva KI-en gjorde, hvordan appen ble testet, og skjermbilder.

Begge versjonene finnes i koden:
- **Versjon 1** ligger urørt i mappen [`versjon-1/`](../versjon-1/) og i git-taggen `v1`.
- **Versjon 2** er hovedappen i rotmappen (git-taggen `v2`).

---

## Versjon 1 – første fungerende app

### Idé (min prompt)

> «Balanse»: studie + trening i én ukeplan.
> Appen kjenner både eksamensdatoene og treningsmålene dine. I rolige uker foreslår den mer trening,
> men når eksamen nærmer seg, skrur den ned treningsintensiteten og opp lesetiden, uten å kutte trening helt
> (siden trening faktisk hjelper på stress og konsentrasjon). Du kan også logge søvn/stressnivå,
> og planen justeres etter det.

### Hva KI-en gjorde

- Foreslo å lage en **PWA (web-app)** som kan legges på hjemskjermen på mobilen, uten app-butikk.
- Skrev planleggingslogikken i `plan.js`: eksamenspress per dag, lesetid, treningsintensitet (Hard/Moderat/Lett),
  aktive pauser og justering etter søvn og stress.
- Lagde fire faner: **Uke**, **Logg**, **Eksamener** og **Mål**, pluss knappen «Last inn eksempeldata» til demo.
- Lagde manifest, service worker og app-ikon, slik at appen kan installeres og fungerer uten nett.

### Testing

- **6 automatiske tester** for logikken (`node --test tests/plan.test.js`), som alle besto. De sjekket blant annet
  at rolige uker gir en ekstra økt, at trening aldri forsvinner helt, og at lite søvn skrur ned belastningen.
- Testet i nettleser i mobilstørrelse (375×812): eksempeldata, logging, eksamensliste og bla mellom uker.
  Ingen feil i konsollen.

### Skjermbilder – versjon 1

| Uke | I dag + «Hvorfor?» | Logg | Eksamener | Mål |
|---|---|---|---|---|
| ![Uke](skjermbilder/versjon-1/1-uke.jpg) | ![I dag](skjermbilder/versjon-1/2-uke-i-dag-hvorfor.jpg) | ![Logg](skjermbilder/versjon-1/3-logg.jpg) | ![Eksamener](skjermbilder/versjon-1/4-eksamener.jpg) | ![Mål](skjermbilder/versjon-1/5-maal.jpg) |

---

## Versjon 2 – lysere design, belønninger og temaer

### Tilbakemelding etter å ha prøvd versjon 1 (mine prompter)

> appen er for mørk, gi meg noe litt lighetere som motiverere meg til å lese. kansje no form for rewards? steraks?

> og themes man kan velege mellom?

> btw behold første versjon. ta ss av alle sider for å holde logg til innlevering på hvordan første versjon var osv

### Hva KI-en gjorde

- **For mørk:** Versjon 1 fulgte telefonens mørke modus automatisk. Nå er standarden et lyst tema («Mint»).
- **Temaer:** Du kan velge mellom fem temaer under *Mål*: Mint, Fersken, Lavendel, Hav og Natt (mørkt, hvis man vil ha det).
  Valget lagres.
- **Streak:** Et kort øverst i ukeplanen viser «🔥 X dager på rad» med en motiverende tekst,
  for eksempel «Les i dag for å holde streaken på 5 dager!». Streaken ryker ikke før dagen er over.
- **Poeng og nivå:** Hver oppgave viser hvor mange poeng den gir (+23 p). Du får 10 poeng per leseøkt,
  pluss 1 poeng per 15 minutter lest, og 5 poeng per treningsøkt. 100 poeng gir et nytt nivå.
- **Merker:** Ny fane **Premier** med 9 merker som låses opp, for eksempel «På gang» (3 dager på rad),
  «10 timer» og «Balansert dag» (lese og trene samme dag).
- **Feiring:** Når du krysser av, kommer det en melding («🔥 5 dager på rad! +23 poeng») og konfetti.
  Det blir ekstra feiring når du låser opp et nytt merke eller går opp et nivå.
- Belønningslogikken ligger i en egen fil, `rewards.js`, med egne tester.
- Første versjon ble tatt vare på i `versjon-1/` og i git, og det ble tatt skjermbilder av alle sidene.

### Testing og forbedringer

- **12 automatiske tester**, som alle besto. De 6 nye sjekker streak (også over månedsskifte og når en dag hoppes over),
  poeng, nivå og merker.
- Testet i mobilstørrelse: avkrysning av lesing og trening, melding og konfetti, Premier-siden og alle temaene.
- **Feil funnet under testing og rettet:**
  - «16 t 30 min lest totalt» ble delt over to linjer på Premier-siden. Nå vises det som «16,5 t».
  - Natt-temaet så ut til å ha lys bakgrunn. Det viste seg at skjermbildet bare ble tatt midt i fargeovergangen,
    så det var ingen feil.

### Skjermbilder – versjon 2

| Uke med streak | Poeng per oppgave | Feiring (Fersken-tema) | Premier |
|---|---|---|---|
| ![Uke](skjermbilder/versjon-2/1-uke-streak.jpg) | ![Poeng](skjermbilder/versjon-2/2-uke-i-dag-poeng.jpg) | ![Feiring](skjermbilder/versjon-2/3-feiring-konfetti-fersken.jpg) | ![Premier](skjermbilder/versjon-2/4-premier.jpg) |

| Logg | Eksamener | Mål + temavelger | Lavendel-tema |
|---|---|---|---|
| ![Logg](skjermbilder/versjon-2/5-logg.jpg) | ![Eksamener](skjermbilder/versjon-2/6-eksamener.jpg) | ![Mål](skjermbilder/versjon-2/7-maal-tema.jpg) | ![Lavendel](skjermbilder/versjon-2/8-tema-lavendel.jpg) |

---

## Neste versjon

*(Legg til nye runder her: hva du ba om, hva som ble endret, og hvordan det ble testet.)*
