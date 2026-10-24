# Balanse – studie og trening i én ukeplan

**Balanse** er en mobilapp (web-app/PWA) som lager en ukeplan for både lesing og trening.
Appen kjenner eksamensdatoene og treningsmålene dine:

- **I rolige uker** foreslår den mer trening (en ekstra økt, harde økter).
- **Når eksamen nærmer seg** skrur den opp lesetiden og ned treningsintensiteten,
  men kutter aldri trening helt, fordi bevegelse hjelper mot stress og gir bedre konsentrasjon.
- **Du kan logge søvn og stressnivå**, og planen justeres etter det.
  Har du sovet dårlig og vært stresset de siste dagene, blir treningen lettere og leseøktene litt kortere,
  og du får et søvntips.

## Problemet appen løser

Mange studenter slutter helt å trene i eksamensperioden, eller de trener like hardt som før og blir utslitte.
Balanse finner en mellomvei automatisk, slik at du slipper å planlegge alt selv.

## Funksjoner

| Fane | Hva den gjør |
|---|---|
| **Uke** | Ukeplan dag for dag med lesetid og treningsøkt. Du krysser av for det du har gjort. Knappen «Hvorfor?» forklarer hver anbefaling. Du kan bla mellom uker. |
| **Logg** | Logg timer søvn og stressnivå (1–5) og se en graf for de siste 14 dagene. |
| **Eksamener** | Legg til og slett eksamener med nedtelling. |
| **Mål** | Treningsøkter per uke, minutter per økt, vanlig lesetid og maks lesetid. Her kan du også laste inn eksempeldata til demo. |

## Slik regner appen ut planen

1. **Eksamenspress (0–1)** for hver dag ut fra hvor mange dager det er til nærmeste eksamen:
   mer enn 21 dager gir 0, 15–21 dager gir 0,2, 8–14 dager gir 0,4, 4–7 dager gir 0,7, 1–3 dager gir 0,9 og eksamensdagen gir 1.
2. **Lesetid** = vanlig lesetid + press × (maks lesetid − vanlig lesetid). I rolige helger leser du mindre.
   På eksamensdagen er det bare 30 minutter lett repetisjon.
3. **Trening**: økter fordeles jevnt utover uka. Intensiteten blir *Hard* når presset er under 0,3,
   *Moderat* når det er under 0,7, og ellers *Lett*. På dager med høyt press uten planlagt økt legges det inn en kort gåtur som aktiv pause.
4. **Overskudd** fra søvn og stress (snitt av de tre siste loggede dagene). Er overskuddet lavt, går treningen ned ett hakk,
   lesetiden ned 15 %, og du får et søvntips.

All logikk ligger i [`plan.js`](plan.js) og er skilt fra brukergrensesnittet ([`app.js`](app.js)), slik at den kan testes for seg.

## Teknologi

- Ren HTML, CSS og JavaScript, uten rammeverk og uten byggesteg.
- PWA: `manifest.json` og service worker (`sw.js`) gjør at appen kan legges på hjemskjermen og fungerer uten nett.
- Data lagres bare lokalt på enheten (`localStorage`). Ingen innlogging, server eller persondata sendes noe sted.

## Kjøre lokalt

```bash
python -m http.server 8080
```

Åpne deretter <http://localhost:8080>.

## Tester

```bash
node --test tests/plan.test.js
```

Testene sjekker blant annet at rolige uker gir en ekstra økt, at eksamen gir mer lesing og lettere trening,
at trening aldri kuttes helt, at lite søvn og høyt stress skrur ned belastningen, og at datoer håndteres riktig over sommertidsskiftet.

## Legge appen på telefonen

- **iPhone:** Åpne lenken i Safari, trykk Del-knappen og velg *Legg til på Hjem-skjerm*.
- **Android:** Åpne lenken i Chrome, trykk ⋮ og velg *Installer app* eller *Legg til på startskjermen*.

## Bruk av KI

Appen er laget med vibe coding i **Claude Code** (Claude Opus 5.5):

1. **Idé:** Jeg beskrev ideen min på norsk: én ukeplan for studie og trening som tilpasser seg eksamener, søvn og stress.
2. **Plan og kode:** KI-en foreslo å lage en PWA (fungerer på mobil uten app-butikk) og skrev planleggingslogikk, grensesnitt og PWA-filer.
3. **Testing:** KI-en skrev automatiske tester for logikken og testet appen i en nettleser i mobilstørrelse
   (eksempeldata, logging, eksamensliste, bla mellom uker, sjekk av konsollfeil).
4. **Forbedringer:** *(fyll inn hva du selv ba om å endre etter å ha prøvd appen, f.eks. tekster, farger, nye funksjoner)*
