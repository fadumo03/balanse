# Utviklingslogg – Balanse

Denne loggen viser hvordan appen ble til med vibe coding i Claude Code, fra første idé til dagens versjon.
For hver versjon står det hva jeg ba om, hva KI-en gjorde, hvordan appen ble testet, og skjermbilder.

Alle versjonene finnes i koden:
- **Versjon 1** ligger urørt i mappen [`versjon-1/`](../versjon-1/) og i git-taggen `v1`.
- **Versjon 2** ligger urørt i mappen [`versjon-2/`](../versjon-2/) og i git-taggen `v2`.
- **Versjon 3** ligger urørt i mappen [`versjon-3/`](../versjon-3/) og i git-taggen `v3`.
- **Versjon 4** er hovedappen i rotmappen (git-taggen `v4`).

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

## Versjon 3 – timer, hage og egne treningsøkter

### Tilbakemelding etter å ha prøvd versjon 2 (mine prompter)

> liker ikke premie systemet fordi det sier meg inegnting lmom jeg er uknuselig. ta inspo fra garden study eller hva enn d heter
> hvor man låser opp. btw ha en timer for study. ikke bare at man huker av, da er d lett å lyve. så hvis man leser la oss si 45 min
> i strekk, så vinner man en speisifkkk item som kan brueks til et eller annet. brainstorm ideer på tekst før du bygger noe

Først kom KI-en med forslag i tekst, uten å bygge noe: en hage (inspirert av Forest), et studentrom eller et akvarium,
en tabell over hvilken plante du får for hvor lang økt, ting du kan vinne og hva de brukes til,
og spørsmålet om hvor streng appen skal være når man går ut av den. Så valgte jeg:

> hage, snill. trening kan krysses av? eller skal d være detaljert for å ta bort decision fatigue hvor man kan sette inn selv.
> og redigere upper day osv idk

### Hva KI-en gjorde

- **Timer i stedet for avkrysning for lesing.** Du trykker «▶ Les nå» og velger en plante. Lengden på økta avgjør planten:
  🌱 Spire 25 min, 🌷 Tulipan og 🌻 Solsikke 45 min, 🌳 Tre 60 min og 🌸 Kirsebærtre 90 min.
  Planten gror på skjermen mens nedtellingen går. Lesetiden i ukeplanen fylles bare av ekte timer-tid.
- **Snill modus mot juks.** Skjermen holdes på mens du leser. Du kan gå ut av appen i inntil 2 minutter.
  Er du borte lenger, eller trykker «Gi opp», visner planten 🥀. Den visne planten blir stående i hagen.
- **Hagen** erstatter merkene. Her ser du alle plantene dine, og været følger søvnloggen:
  ☀️ sol når du har sovet godt, 🌧️ regn når du har sovet lite eller er stresset.
- **Ting du vinner og kan bruke:**
  - 💧 **Vann** (når du har trent, maks én per dag) – trykk på en plante for å få den til å blomstre. Dette binder sammen lesing og trening.
  - 🌾 **Gjødsel** (etter 3 økter på én dag) – gir en gyllen plante ✨ neste økt.
  - 🧊 **Streak-frys** (for hver 7. dag på rad) – redder streaken automatisk hvis du glemmer en dag.
  - 🏵️ **Eksamensblomst** – når du fullfører en økt dagen før en eksamen.
  - 🪑 **Pynt** (benk, lykt, sommerfugler, froskedam, fontene og mer) – låses opp etter antall timer lest, og du plasserer den selv i hagen.
- **Frøkatalog**: viser alle plantene. De du ikke har ennå, vises som grå silhuetter med tekst om hva som skal til,
  for eksempel «Les 60 min i strekk». Da vet du alltid hva du jobber mot.
- **Trening uten «decision fatigue»**: Under *Mål* lager du dine egne økter for Hard, Moderat og Lett.
  Appen velger fra listene hver dag. I ukeplanen kan du bytte økt eller sette hviledag på hver dag. Trening krysses fortsatt av.
- Versjon 2 ble tatt vare på i `versjon-2/`.

### Testing og forbedringer

- **17 automatiske tester**, som alle besto. De 11 nye sjekker blant annet timeren (fortsetter, fullføres, visner etter 2 min),
  at visne planter ikke gir minutter, gjødsel, streak-frys, eksamensblomst, at vann bare kan fås én gang per dag, pynt,
  været og treningsmaler.
- Testet i mobilstørrelse: hele timer-flyten (velg plante → timer → fullført økt), en plante som visner etter 3 min borte,
  vanning av planter, plassering av pynt, bytte av treningsøkt og egne økter.
- **Feil funnet under testing og rettet:**
  - Himmelen øverst i hagen var usynlig når det regnet. CSS-klassen `rain` på himmelen kolliderte med regnlaget,
    som også het `rain` og var skjult. Klassene fikk nye navn.
  - Emojiene for gjødsel (🪴) og liljedam (🪷) vises som tomme firkanter på eldre enheter. De ble byttet til 🌾 og 🐸.
  - «Bytt…»-menyen for trening stakk ut av kortet. Den er flyttet under teksten.
  - En Hard økt valgt på en lett dag fikk bare 25 minutter. Nå styrer det valgte nivået minuttene.
  - Eksempeldataene brukte opp alt vannet, så det var ingenting å teste vanning med. Nå er det vann igjen.

### Skjermbilder – versjon 3

| Uke: timer + egen økt | Velg plante | Timeren går | Økt fullført |
|---|---|---|---|
| ![Uke](skjermbilder/versjon-3/1-uke-timer-og-trening.jpg) | ![Velg](skjermbilder/versjon-3/2-velg-plante.jpg) | ![Timer](skjermbilder/versjon-3/3-timer-gaar.jpg) | ![Fullført](skjermbilder/versjon-3/4-okt-fullfort.jpg) |

| Planten visnet | Hagen (regnvær) | Lager og pynt | Mine treningsøkter |
|---|---|---|---|
| ![Visnet](skjermbilder/versjon-3/5-planten-visnet.jpg) | ![Hagen](skjermbilder/versjon-3/6-hagen.jpg) | ![Lager](skjermbilder/versjon-3/7-lager-og-pynt.jpg) | ![Økter](skjermbilder/versjon-3/8-mine-treningsokter.jpg) |

---

## Versjon 4 – minimalt og moderne design

### Tilbakemelding etter å ha prøvd versjon 3 (min prompt)

Jeg la ved et skjermbilde av streak-kortet med den store flammen og skrev:

> liker ikke dette . dn svære fire greia. gjør appen mer minimal og mer modenrne. fiks emojiene.

### Hva KI-en gjorde

- **Det store flammekortet er borte.** Øverst er det nå en rolig rad med tre små nøkkeltall:
  dager på rad, planter denne uka og været i hagen, pluss én kort setning under.
- **Ingen emojier.** Emojier ser forskjellige ut på hver telefon, og på Windows ble de tykke og barnslige.
  Alt er erstattet med egne tegninger i `icons.js`:
  - strektegnede ikoner til menyen, knapper, lager og vær (flamme, spire, dråpe, snøfnugg, sol, sky og regn)
  - flate, enkle illustrasjoner av alle plantene (frø, spire, tulipan, solsikke, tre, kirsebærtre, eksamensblomst og visnet plante)
    og av pynten (benk, lykt, sommerfugler, dam, fontene, sopp og hagestue)
- **Mer moderne uttrykk:** skrifttypen Inter, en liten overskrift i store bokstaver over tittelen, roligere farger,
  mykere skygger, smalere fremdriftslinjer, runde «Les»-knapper og en fanemeny med uskarp bakgrunn.
- **Hagen** har lyse, nøytrale ruter i stedet for brun jord. Tørste planter vises grå til de blir vannet.
  Den store himmelen med regnanimasjon er byttet ut med en liten værmerkelapp.
- Versjon 3 ble tatt vare på i `versjon-3/`.

### Testing og forbedringer

- Alle **17 automatiske tester** består fortsatt, siden logikken ikke er endret.
- Et søk etter emojier i koden ga ingen treff.
- Testet i mobilstørrelse: ukeplanen, frøvelgeren, timeren, fullført økt, en økt der jeg ga opp, hagen, pynt, katalog og treningsøkter.
- **Feil funnet under testing og rettet:**
  - Plantetegningen inni timeren var rotert 90 grader. CSS-regelen som roterer fremdriftsringen traff også planten.
    Den gjelder nå bare selve ringen.
  - Nøkkeltallene ble delt over to linjer («7 dager / på rad»). Nå står tallet øverst og teksten under.
  - En kort inntoning når man byttet fane gjorde at skjermbildene ble blasse. Den ble fjernet, som passer med et mer minimalt design.
  - Teksten under timeren begynte med liten bokstav («solsikke gror…»).

### Skjermbilder – versjon 4

| Uke | I dag | Velg plante | Timer |
|---|---|---|---|
| ![Uke](skjermbilder/versjon-4/1-uke.jpg) | ![I dag](skjermbilder/versjon-4/2-i-dag.jpg) | ![Velg](skjermbilder/versjon-4/3-velg-plante.jpg) | ![Timer](skjermbilder/versjon-4/4-timer.jpg) |

| Økt fullført | Hagen | Pynt og frøkatalog | Treningsøkter |
|---|---|---|---|
| ![Fullført](skjermbilder/versjon-4/5-okt-fullfort.jpg) | ![Hagen](skjermbilder/versjon-4/6-hagen.jpg) | ![Pynt](skjermbilder/versjon-4/7-pynt-og-katalog.jpg) | ![Økter](skjermbilder/versjon-4/8-treningsokter.jpg) |

---

## Neste versjon

*(Legg til nye runder her: hva du ba om, hva som ble endret, og hvordan det ble testet.)*
