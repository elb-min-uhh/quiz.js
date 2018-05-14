### Changelog

* __0.4.2__:
  * New features:
    * Added language selection with `<.. lang="en">` or `quizJS.setLanguage("en")`
      * German is the default language 
  * Fixes:
    * Fix for reset of Petri tasks
    * More consistent usage of english for classes
* __0.4.1__:
  * Fixes:
    * Display/Clone of previously answered questions is possible again.
    Check the documentation to see how.
  * Other:
    * Refactored the code. All functions and variables are stored in `quizJS`

#### Older versions (currently not available in _english_)

* __0.4.0__ (zu eLearn.js 1.0.1):
  * Neuerungen:
    * Das _quiz.js_ kann nun auch unabhängig vom _elearn.js_ verwendet werden
    * es existiert wieder _quizJS_ als Objekt, welches Einstellungsmöglichkeiten
    erlaubt
* __0.3.5__ (zu eLearn.js 1.0.0):
  * Neuerungen:
    * Das _quiz.js_ ist als anonyme Funktion umgesetzt und somit voll
    automatisiert. Über Javascript ist keine Schnittstelle verfügbar, es wird
    alles über die Code-Ergänzungen in HTML umgesetzt
  * Fehlerbehebungen:
    * Für Sortieraufgaben wurde ein Fehler behoben, durch den nach Zurücksetzen
    der Frage keine Antworten mehr sichtbar waren
* __0.3.4__ (zu eLearn.js 0.9.9):
  * Neuerungen:
    * Button Stil selbstdefiniert, da abweichend von eLearn.js Stil (ab 0.9.9)
  * Fehlerbehebungen:
    * Fehler in der Darstellung von Klassifikations- und Sortieraufgaben behoben
* __0.3.3__ (zu eLearn.js 0.9.7):
  * Neuerungen:
    * Darstellung der richtigen und falschen Antworten für Auswahlfragen
    verändert
  * Fehlerbehebungen:
    * Ursprüngliche HTML Form von Auswahlfragen ist zusätzlich zur neuen
    Variante wieder funktionsfähig
    * Fehler der Darstellung von Zielobjekten bei Quizaufgaben mit dem Typen
    Reihenfolge wurden behoben
    * Die Vorschrift der Strukturierung von Quizaufgaben wurde gelockert, um
    nicht funktionsfähige Aufgaben durch minimale Fehler im HTML Code zu
    vermeiden
* __0.3.2__:
  * Neuerungen:
    * Erstellung von Matrix- und Auswahlaufgaben vereinfacht
    * Leere Zielobjekte in Zuordnungsaufgaben möglich, wenn mindestens ein
    Objekt zugeordnet wurde
* __0.3.1__:
  * Neuerungen:
    * Mehrere richtige Antwortmöglichkeiten für Lückentext- und
    Zuordnungsaufgaben
  * Fehlerbehebungen:
    * Aufgaben mit zeitlicher Begrenzung werden gesperrt, wenn die Section die
    bestimmte Zeit aktiv war. Zuvor wurden die Zeiten nicht korrekt gestoppt.
* __0.3.0__:
  * Neuerungen:
    * Neue Fragetypen: Freitext, Lückentext, Fehlertext, Hotspot, Zuordnung,
    Reihenfolge, Matrix, Petrinetze, Zeichnung (Siehe Dokumentation)
    * Zeitliche Begrenzung von Fragen
    * Darstellung der Bildauswahlfragen verändert
    * Darstellung der richtigen und falschen Antworten bei Auswahlfragen
    angepasst
  * Fehlerbehebungen:
    * Wiederangezeigte Fragen per Referenz werden nicht mehr doppelt angezeigt
    * Auch veraltete Aufgaben werden korrekt blockiert, wenn gewollt
* __0.2.1__:
  * _Grundversion für das eLearn.js_
