# Progettare conversazioni: 3 regole per creare assistenti vocali con cui i clienti amano parlare

![Progettare conversazioni: 3 regole per creare assistenti vocali con cui i clienti amano parlare](header.png)

Scrivere istruzioni per un agente vocale è completamente diverso dallo scrivere testi per un widget di chat. Se il tuo bot vocale parla per lunghi paragrafi, i chiamanti si annoieranno, perderanno il filo dei dettagli o semplicemente interromperanno il bot a metà frase.

In un'interfaccia di chat basata su testo, gli utenti possono scorrere visivamente i paragrafi secondo i propri ritmi. Possono rileggere le frasi, ignorare le parole di riempimento e individuare con facilità la call-to-action. La voce, al contrario, è lineare ed effimera. Quando un cliente telefona alla tua attività, è vincolato a un flusso uditivo in tempo reale. Ogni secondo che il tuo assistente trascorre parlando è un secondo in cui il chiamante deve ascoltare attivamente, memorizzare e attendere per poter rispondere.

Per costruire agenti vocali che risultino naturali e piacevoli, devi cambiare prospettiva: dal "content writing" al "conversation design". In questo articolo analizzeremo tre regole fondamentali per formulare prompt per assistenti vocali capaci di stimolare l'interazione e incrementare la soddisfazione del cliente (CSAT) sfruttando le primitive conversazionali di Orbitali.

---

## Regola 1: Mantieni la brevità (Il vincolo di 1-2 frasi)

L'errore più comune commesso dagli sviluppatori al primo rilascio di un'IA vocale è trattare la risposta del prompt come un'email o una pagina di FAQ. Se il tuo agente genera quattro o cinque frasi consecutive, il chiamante andrà quasi sicuramente incontro a sovraccarico cognitivo.

Nel design conversazionale per la voce, la regola d'oro è semplice: **le risposte devono limitarsi a una o due frasi.**

Mantenendo le risposte concise, crei una cadenza dinamica di alternanza dei turni. Ciò rispecchia il modo in cui gli esseri umani conversano naturalmente al telefono. Invece di riversare tutte le informazioni all'inizio, il tuo agente vocale dovrebbe fornire un singolo dettaglio essenziale e restituire subito la parola al chiamante ponendo una domanda di chiarimento.

### Il confronto

* **❌ Stile da Chat (Troppo Lungo):** *"Buongiorno, grazie per aver chiamato lo Studio Dentistico Acme. Siamo al servizio della comunità locale da oltre quindici anni. Posso aiutarla a fissare un nuovo appuntamento, verificare i dettagli della sua copertura assicurativa o rispondere a domande relative alla fatturazione. Per iniziare, potrebbe fornirmi il suo nome completo e la data di nascita, oppure indicarmi se è già un nostro paziente?"*
* **Ottimizzato per la Voce (Breve e Diretto):** *"Grazie per aver chiamato lo Studio Dentistico Acme. Posso aiutarla a fissare un appuntamento, verificare l'assicurazione o chiarire dubbi di fatturazione. Di cosa ha bisogno oggi?"*

Quando configuri le istruzioni dinamiche del tuo agente tramite il payload webhook `agent:assistant-request`, includi sempre vincoli espliciti sulla lunghezza delle frasi:

```json
{
  "prompt": "Sei un receptionist di front desk. Aiuta il cliente a fissare un appuntamento. CRUCIALE: Limita ogni risposta a un massimo di 1-2 frasi. Non generare mai interi paragrafi. Poni domande chiarificatrici per guidare l'utente passo dopo passo."
}
```

---

## Regola 2: Parla come un essere umano (Transizioni conversazionali)

Una conversazione deve scorrere con naturalezza, senza sembrare un'interfaccia a riga di comando. I sistemi IVR tradizionali costringevano gli utenti ad ascoltare menu rigidi (*"Per il commerciale prema 1..."*). Quando sviluppano agenti vocali IA, gli sviluppatori a volte ricadono in questo schema, istruendo il bot a porre domande binarie e robotiche.

Per far percepire l'assistente come naturale, indicalo a utilizzare **marcatori conversazionali** (ad es. *"Certamente,"* *"Ricevuto,"* *"Perfetto,"* *"Verifico subito..."*) all'inizio dei suoi turni di parola.

Queste brevi espressioni svolgono due funzioni cruciali:
1. **Feedback uditivo:** Rassicurano il chiamante che l'IA ha ascoltato e compreso quanto appena affermato.
2. **Mascheramento della latenza:** Recuperare dati da un database tramite webhook o eseguire una ricerca semantica richiede uno o due secondi. Dicendo *"Certamente, controllo subito i dati del suo account..."* prima di richiamare il tool, l'agente mantiene vivo il contatto con l'interlocutore durante la breve elaborazione.

### Ottimizzare i prompt per le transizioni

Quando scrivi le istruzioni del tuo agente, definisci esplicitamente come deve accogliere le risposte dell'utente:

* **Stile prompt robotico:** *"Quando l'utente ti fornisce il numero di account, richiama immediatamente il tool di ricerca."*
* **Stile prompt conversazionale:** *"Quando l'utente comunica il proprio numero di account, rispondi subito con una frase naturale come 'Perfetto, recupero subito la sua scheda' o 'Certamente, verifico immediatamente per lei', e solo dopo esegui il tool di ricerca."*

Questo piccolo accorgimento elimina silenzi imbarazzanti e fa sentire l'interazione come una collaborazione cordiale, anziché come un interrogatorio.

---

## Regola 3: Gestisci il passaggio all'operatore (Handoff impeccabile verso esseri umani)

Nessun agente vocale può risolvere il 100% delle problematiche dei clienti. Un cliente potrebbe presentare un caso limite specifico, richiedere un responsabile o semplicemente manifestare frustrazione. Il segno distintivo di un'esperienza vocale d'eccellenza non risiede nella capacità di gestire ogni singolo scenario, ma **nella grazia con cui gestisce i limiti del sistema**.

Quando un agente esaurisce le proprie capacità di risoluzione, deve trasferire il chiamante a un operatore umano senza attrito.

Orbitali semplifica questo passaggio esponendo il tool di sistema nativo `transfer_call`. Se per il tuo numero telefonico è impostata una destinazione di inoltro valida, l'agente può invocare `transfer_call` dinamicamente quando si verificano determinati criteri.

### Strutturare l'handoff nelle istruzioni

Per implementare un trasferimento fluido, devi istruire l'agente su *quando* trasferire la chiamata e su *come* annunciare il passaggio:

1. **Identifica il trigger:** Addestra l'agente a riconoscere segnali di frustrazione (es. tono di voce alterato, richieste reiterate) o tematiche complesse fuori perimetro (es. controversie legali, rettifiche contabili avanzate).
2. **Annuncia il trasferimento:** L'agente non deve mai trasferire una chiamata in silenzio. Deve spiegare chiaramente cosa sta accadendo, affinché il cliente non pensi che sia caduta la linea.
3. **Esegui il tool:** Invia il comando al tool `transfer_call`.

Ecco un esempio di struttura di prompt per la gestione dei trasferimenti:

```markdown
- **Argomenti fuori perimetro:** Se il chiamante chiede informazioni su rettifiche contabili personalizzate o richiede di parlare con un responsabile, devi effettuare il trasferimento.
- **Protocollo di handoff:** 
  1. Pronuncia: "Sarò lieto di passarla a un nostro collega per approfondire. La trasferisco subito alla nostra reception."
  2. Esegui immediatamente il tool di sistema `transfer_call`.
```

Offrendo un percorso chiaro e trasparente verso un operatore umano, costruisci fiducia, anche nei casi in cui l'IA non può risolvere direttamente la richiesta.

---

## Basso rischio, alto impatto: Perché l'ottimizzazione dei prompt è sicura

Gli sviluppatori tendono a essere prudenti nell'aggiornare funzionalità basate su IA in produzione, temendo regressioni nel codice, errori nei database o problemi di sicurezza.

Tuttavia, ottimizzare il design conversazionale e la strategia dei prompt del tuo assistente vocale è **un'operazione del tutto priva di rischi sul codice**.

Poiché queste direttive risiedono nel livello del prompt — staticamente nella configurazione dell'agente o restituite dinamicamente tramite il tuo server webhook `agent:assistant-request` — non modificano il codice di backend del tuo database né toccano le credenziali di autenticazione. Perfezionare i prompt per imporre brevità, inserire marcatori discorsivi o calibrare le soglie di trasferimento non richiede modifiche architetturali, rappresentando la leva a più alto impatto e minor rischio per elevare la soddisfazione cliente e ridurre il tasso di abbandono delle chiamate.

*Pronto a progettare la tua prima conversazione? [Consulta la nostra Guida di Prompt Engineering](https://docs.orbitali.ai/prompts) o [crea un account sviluppatore su Orbitali](https://orbitali.ai/signup) per testare i tuoi prompt direttamente nel simulatore via browser.*
