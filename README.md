# Balanse – studie og trening i én ukeplan

**Balanse** er en mobilapp (web-app/PWA) som lager en ukeplan for både lesing og trening.
Appen kjenner eksamensdatoene og treningsmålene dine:

- **I rolige uker** foreslår den mer trening (en ekstra økt, harde økter).
- **Når eksamen nærmer seg** skrur den opp lesetiden og ned treningsintensiteten,
  men kutter aldri trening helt, fordi bevegelse hjelper mot stress og gir bedre konsentrasjon.
- **Du kan logge søvn og stressnivå**, og planen justeres etter det.
- **Du leser med timer**, og hver fullført økt gror en plante i hagen din. Gir du opp, visner planten.
  Da kan du ikke bare krysse av for lesing du ikke har gjort.

## Problemet appen løser

Mange studenter slutter helt å trene i eksamensperioden, eller de trener like hardt som før og blir utslitte.
Balanse finner en mellomvei automatisk. Hagen gir deg en ærlig og synlig belønning for faktisk lesetid.

## Funksjoner

| Fane | Hva den gjør |
|---|---|
| **Uke** | Ukeplan dag for dag. Lesing startes med «▶ Les nå» og fylles av timer-tid. Trening hentes fra dine egne økter, kan byttes per dag og krysses av. «Hvorfor?» forklarer hver anbefaling. Streak-kortet viser hvor mange dager på rad du har lest. |
| **Logg** | Logg søvn og stress (1–5) og se en graf for de siste 14 dagene. Påvirker planen og været i hagen. |
| **Hage** | Alle plantene dine, været, lageret (tørste planter, gjødsel og streak-frys), pynt du kan plassere og en frøkatalog over alle plantene. |
| **Eksamener** | Legg til og slett eksamener med nedtelling. |
| **Innstillinger** | Mål for uka (trening og lesetid), dine egne treningsøkter for Hard, Moderat og Lett, 5 temaer og eksempeldata til demo. Sletting må bekreftes, så du ikke sletter noe ved et uhell. |

### Leseøkt med timer

| Økt i strekk | Plante |
|---|---|
| 25 min | Spire |
| 45 min | Tulipan eller solsikke |
| 60 min | Tre |
| 90 min | Kirsebærtre |

Skjermen holdes på under økta. **Snill modus:** Du kan gå ut av appen i inntil 2 minutter. Er du borte lenger, visner planten.
En vissen plante kan **gjenopplives**: trykk på den i hagen og les like lenge som den opprinnelige planten krevde,
så blir den til den opprinnelige planten igjen i samme rute.

### Ting du vinner

- **Vann:** én treningsøkt vanner hele hagen, så alle tørste planter blomstrer. Planter du får senere samme dag blomstrer med én gang.
- **Gjødsel:** fås etter 3 økter på én dag. Neste plante blir gyllen.
- **Streak-frys:** fås for hver 7. dag på rad. Redder streaken automatisk en dag du glemmer.
- **Eksamensblomst:** fås når du fullfører en økt dagen før en eksamen.
- **Pynt:** låses opp etter totalt antall timer lest, og du plasserer den selv i hagen.

## Slik regner appen ut planen

1. **Eksamenspress (0–1)** for hver dag ut fra hvor mange dager det er til nærmeste eksamen:
   mer enn 21 dager gir 0, 15–21 dager gir 0,2, 8–14 dager gir 0,4, 4–7 dager gir 0,7, 1–3 dager gir 0,9 og eksamensdagen gir 1.
2. **Lesetid** = vanlig lesetid + press × (maks lesetid − vanlig lesetid). I rolige helger leser du mindre.
   På eksamensdagen er det bare 30 minutter lett repetisjon.
3. **Trening**: økter fordeles jevnt utover uka. Intensiteten blir *Hard* når presset er under 0,3,
   *Moderat* når det er under 0,7, og ellers *Lett*. Selve økta hentes fra listene dine. På dager med høyt press
   uten planlagt økt legges det inn en kort gåtur som aktiv pause.
4. **Overskudd** fra søvn og stress (snitt av de tre siste loggede dagene). Er overskuddet lavt, går treningen ned ett hakk,
   lesetiden ned 15 %, og du får et søvntips.

Planlogikken ligger i [`plan.js`](plan.js) og hagelogikken (timer, planter, ting og streak) i [`garden.js`](garden.js).
Begge er skilt fra brukergrensesnittet ([`app.js`](app.js)), slik at de kan testes for seg.
Alle ikoner og illustrasjoner er egne SVG-tegninger i [`icons.js`](icons.js), slik at appen ser lik ut på alle enheter.

## Teknologi

- Ren HTML, CSS og JavaScript, uten rammeverk og uten byggesteg. Skrifttypen er Inter (Google Fonts).
- PWA: `manifest.json` og service worker (`sw.js`) gjør at appen kan legges på hjemskjermen og fungerer uten nett.
- Screen Wake Lock API holder skjermen på under leseøkter.
- Data lagres bare lokalt på enheten (`localStorage`). Ingen innlogging, server eller persondata sendes noe sted.

## Kjøre lokalt

```bash
python -m http.server 8080
```

Åpne deretter <http://localhost:8080>. Tidligere versjoner ligger på `/versjon-1/`, `/versjon-2/` og `/versjon-3/`.

## Tester

```bash
node --test tests/plan.test.js tests/garden.test.js
```

De 20 testene sjekker planen (eksamenspress, trening som aldri forsvinner, søvn og stress, datoer over sommertid)
og hagen (timer og visning, gjenoppliving, planter, gjødsel, streak-frys, eksamensblomst, vann, pynt, vær og treningsmaler).

## Legge appen på telefonen

- **iPhone:** Åpne lenken i Safari, trykk Del-knappen og velg *Legg til på Hjem-skjerm*.
- **Android:** Åpne lenken i Chrome, trykk ⋮ og velg *Installer app* eller *Legg til på startskjermen*.

## Bruk av KI

Appen er laget med vibe coding i **Claude Code** (Claude Opus 5.5).
Hele prosessen, med promptene mine, hva som ble endret, testing og skjermbilder av hver versjon, står i
**[utviklingsloggen](dokumentasjon/utviklingslogg.md)**.

1. **Versjon 1** ([`versjon-1/`](versjon-1/)): Jeg beskrev ideen min. KI-en foreslo å lage en PWA og skrev planlogikk,
   grensesnitt og tester.
2. **Versjon 2** ([`versjon-2/`](versjon-2/)): Appen var for mørk og manglet motivasjon. Den fikk et lyst design,
   streaks, poeng, merker og 5 temaer.
3. **Versjon 3** ([`versjon-3/`](versjon-3/)): Merkene sa meg ingenting, og avkrysning var lett å jukse med. Jeg ba KI-en brainstorme først.
   Så valgte jeg en hage med timer (inspirert av Forest) i snill modus, ting man vinner og kan bruke, og egne treningsøkter
   for å slippe «decision fatigue». Under testingen ble fem feil funnet og rettet.
4. **Versjon 4**: Det store flammekortet og emojiene føltes barnslige. Appen fikk et minimalt og moderne design
   med egne tegnede ikoner og planteillustrasjoner. Under testingen ble fire feil funnet og rettet.
