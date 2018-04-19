/*
* quiz.js v0.4.0 - 18/04/16
* Ergänzend zum elearn.js v1.0.1
* JavaScript Quiz - by Arne Westphal
* eLearning Buero MIN-Fakultaet - Universitaet Hamburg
*/


// Quiztypen. Benennung entspricht dem, was im HTML Attribut qtype angegeben ist.
var quizTypes = {
    SHORT_TEXT : "short_text",
    CHOICE : "choice",
    FREE_TEXT : "free_text" ,
    FILL_BLANK : "fill_blank",
    FILL_BLANK_CHOICE : "fill_blank_choice",
    ERROR_TEXT : "error_text",
    HOTSPOT : "hotspot",
    CLASSIFICATION : "classification",
    ORDER : "order",
    MATRIX_CHOICE : "matrix_choice",
    PETRI : "petri",
    DRAW : "drawing"
};

var QuizJSOptions = function(timerAlertActive, timerAlertText) {
    this.timerAlertActive = timerAlertActive;
    this.timerAlertText = timerAlertText;

    this.setTimerAlert = function(bool, text) {
        this.timerAlertActive = bool;
        this.timerAlertText = text;
    };

    // --------------------------------------------------------------------------------------
    // COPY QUESTION TO SHOW AGAIN
    // --------------------------------------------------------------------------------------

    /**
    * Kopiert die Frage ohne Bestätigungsbuttons (reiner Fragekörper)
    */
    this.showQuestionHere = function(button) {
        var self = this;

        var id = $(button).attr("id").replace("_ref", "");

        var orig = $('#'+id);

        var div = orig.clone();
        div.addClass("cloned");

        // zählt immer als beantwortet
        div.addClass("answered");

        // hinweis, dass nicht veränderbar
        div.find(".answered_hint").remove();
        div.find("h4").after(
            '<span class="answered_hint">Nicht änderbar, da die Frage bereits beantwortet wurde</span>');

        var type = orig.attr("qtype");
        // Verarbeiten der vorherigen Eingaben
        if(type === quizTypes.FREE_TEXT) {
            this.copyFreeText(div, orig);
        }
        else if(type === quizTypes.FILL_BLANK) {
            this.copyFillBlank(div, orig);
        }
        else if(type === quizTypes.FILL_BLANK_CHOICE) {
            this.copyFillBlankChoice(div, orig);
        }
        else if(type === quizTypes.HOTSPOT) {
            this.copyHotspot(div);
        }
        else if(type === quizTypes.DRAW) {
            this.copyDrawing(div, orig);
        }

        this.blockQuestion(div);


        var hideButton = $('<button class="free_text_ref" id="'+id+'_ref">Ausblenden</button>');
        hideButton.on('click', function(e) {
            self.removeQuestionHere(hideButton);
        })
        $(button).before(div);
        $(button).before(hideButton)
        $(button).hide();
    }

    this.removeQuestionHere = function(button) {
        $(button).prev().remove();
        $(button).next().show();
        $(button).remove();
    }


    this.copyFreeText = function(div, orig) {
        div.find("textarea").val(orig.find("textarea").val());
    }

    this.copyFillBlank = function(div, orig) {
        div.find("input").each(function(i, e) {
            // Kopiert ausgewählten Wert
            $(this).val($($(orig).find("input").get(i)).val());
        });
    }

    this.copyFillBlankChoice = function(div, orig) {
        div.find("select").each(function(i, e) {
            // Kopiert ausgewählten Wert
            $(this).val($($(orig).find("select").get(i)).val());
        });
    }


    this.copyHotspot = function(div) {
        // hover funktionen
        div.find('.hotspot').mouseover(function(event) {
            if($(this).find('.descr').children().length > 0) $(this).find('.descr').show();
            calculateHotspotDescriptions($(this).closest('[qtype="'+quizTypes.HOTSPOT+'"]'));
        });
        div.find('.hotspot').mouseout(function(event) {
            $(this).find('.descr').hide();
        });
    }

    this.copyDrawing = function(div, orig) {
        var canvas_orig = orig.find('.drawing_canvas_container').find('canvas.drawing_canvas.act')[0];
        var canvas = div.find('.drawing_canvas_container').find('canvas.drawing_canvas.act')[0];

        div.find('.drawing_canvas_container').find('canvas').not('.act').remove();

        div.find('.button_container').remove();
        div.find('.feedback.correct').show();

        canvas.getContext('2d').drawImage(canvas_orig, 0, 0);
    }

    this.blockQuestion = function(div) {
        div.addClass("answered");

        var type = div.attr("qtype");

        if(type === quizTypes.FREE_TEXT) {
            div.find("textarea").attr("readonly", "readonly");
        }
        else if(type === quizTypes.SHORT_TEXT
                || type === quizTypes.CHOICE
                || type === quizTypes.FILL_BLANK
                || type === quizTypes.MATRIX_CHOICE
                || type == undefined) {
            // Disabled jedes input
            div.find("input").attr("disabled", true);
        }
        else if(type === quizTypes.FILL_BLANK_CHOICE) {
            div.find("select").attr("disabled", true);
        }
        else if(type === quizTypes.CLASSIFICATION
                || type === quizTypes.ORDER) {
            div.find('.object').addClass("blocked");
        }
        else if(type === quizTypes.HOTSPOT) {
            div.find('.hotspot').addClass("blocked");
        }
        else if(type === quizTypes.PETRI) {
            div.find('.place').addClass("blocked");
        }
        else if(type === quizTypes.DRAW) {
            div.find('.drawing_canvas_container').addClass("blocked");
        }
    }
}

var quizJS = new QuizJSOptions(false, "");

// anonymous function, so functions cannot be used from console or by mistake
(function() {

var nextQuestionId = 0;
var start_time = {};
var passed_time = {};
var questionVisibility = {};

/**
* Aktiviert alle <button> mit der Klasse "quizButton" für das Quiz.
* Wenn fragen <input> fokussiert ist, kann mit Enter die Antwort abgeschickt werden.
*/
$(document).ready(function() {
    initiateQuiz();

    // fallback for browsers who do not support IntersectionObservers, only for elearn.js
    document.addEventListener("ejssectionchange", updateQuestionVisibility);
});


// ------------------------------------------------------------
// INTERFACE
// ------------------------------------------------------------

/**
* Gibt zurück, ob alle sichtbaren Fragen beantwortet wurden. (bool)
*/
function getVisibleQuestionsAnswered() {
    return $('.question:visible').filter('.answered').length
            == $('.question:visible').length;
}


// ------------------------------------------------------------



/**
* Diese Funktion initialisiert das Quiz.
*/
function initiateQuiz() {
    // Keine Tastaturnavigation
    keyAllowed = false;

    // Add qtypes if none defined
    $('div.question').each(function() {
        var div = $(this);
        if(div.attr('qtype') == undefined) {
            if(div.find('input[type="text"]').length > 0) {
                div.attr('qtype', quizTypes.SHORT_TEXT);
            }
            else if(div.find('input[type="checkbox"]').length > 0
                    || div.find('input[type="radio"]').length > 0) {
                div.attr('qtype', quizTypes.CHOICE);
            }
        }
    });

    // Buttons hinzufügen
    $('div.question').after('<button class="quizButton">Lösen</button><button class="quizButton weiter">Zurücksetzen</button>');

    // Hide Feedbacks
    $("div.question").children("div.feedback").hide();

    // Add No Selection Feedback
    $("div.question").append('<div class="feedback noselection">Du musst diese Frage zuerst beantworten, bevor du lösen kannst.</div>');

    // Hide Weiter-Buttons
    $("button.weiter").hide();

    windowResizing();
    $(window).resize(function() {windowResizing()});

    shuffleAnswers();
    replaceRandoms();

    $(":button").filter(".quizButton").click(function() {
        submitAns(this);
    });

    // Submit with enter for every question possible
    $(".answers label").keyup(function(event) {
        if(event.which == 13) {
            var div = $(this).closest("div.question");
            if(!div.is('[qtype="'+quizTypes.FREE_TEXT+'"]')) {
                div.next(':button').click();
            }
        }
    });


    // Fehlertext Buttons toggle
    $(".error_button").click(function() { toggleErrorButton(this); });

    $("#neustart").click(function() {
        resetQuiz();
    });

    addDragAndDropToClassification();
    addDragAndDropToOrderObjects();

    resetQuiz();

    initiateChoice();
    initiateFreeText();
    initiateErrorText();
    initiateMatrix();
    initiateHotspotImage();
    initiatePetriImage();
    initiateDrawingCanvas();

    initListeners();
    initTimers();
}

function initListeners() {
    $('div.question').each(function(i, e) {
        const el = $(e);
        try {
            var options = {
                root: document.body,
                rootMargin: '0px',
                threshold: 1.0
            }

            var observer = new IntersectionObserver(function(entries, observer) {
                for(var entry of entries) {
                    resizeQuestion($(entry.target));
                }
            }, options);

            observer.observe(el.get(0));
        } catch(e) {
            // ignore;
        }
        // resizesensor as visibility listener this will only work with Chrome engine browsers
        try {
            new ResizeSensor(el, function(dim) {
                resizeQuestion(el);
            });
        } catch(e) {
            // ignore;
        }
    });
}

/**
* Wird beim Bestätigen einer Antwort aufgeruffen.
* @param button - ist der geklickte Button von dem aus die beantwortete Frage
*                 bestimmt wird.
*/
function submitAns(button, force) {
    if($(button).filter(".weiter").length > 0) {
        button = $(button).prev(":button");
    }
    var div = $(button).prev('div.question');

    // Falls die Frage bereits beantwortet wurde, wird sie zurückgesetzt. (2. Button)
    if(div.is('.answered')) {
        resetQuestion(div);
        return;
    }

    var c = elementsToTextArray(div.find("a.ans"));

    var labels = div.find('.answers').find('label');
    deleteLabelColoring(labels);

    var type = div.attr("qtype");


    var correct = true;

    // Für alte Versionen oder nichtdefinierte Fragetypen
    if(type === undefined) {
        type = labels.find('input').attr("type");

        if(type === "text") {
            correct = getCorrectForText(labels, c);
        }
        else if (type === "radio" || type === "checkbox") {
            correct = getCorrectForRadio(labels, c, true);
        }
    }
    // Für explizit definierten qtype
    else {
        if(type === quizTypes.SHORT_TEXT) {
            correct = getCorrectForText(labels, c, force);
        }
        else if(type === quizTypes.CHOICE) {
            correct = getCorrectForRadio(labels, c, true, force);
        }
        else if(type === quizTypes.FREE_TEXT) {
            processFreeText(div);
        }
        else if(type === quizTypes.FILL_BLANK) {
            var answers = div.find("a.ans");
            correct = getCorrectFillBlank(labels, answers, force);
        }
        else if(type === quizTypes.FILL_BLANK_CHOICE) {
            var answers = div.find("a.ans");
            correct = getCorrectFillBlankChoice(labels, answers, force);
        }
        else if(type === quizTypes.ERROR_TEXT) {
            var buttons = div.find(".error_button");
            correct = getCorrectErrorText(buttons, c, force);
        }
        else if(type === quizTypes.CLASSIFICATION) {
            var dests = div.find(".destination");
            var answers = div.find("a.ans");
            correct = getCorrectClassification(dests, answers, force);
            if(correct !== -1) {
                div.find('.object').addClass("blocked");
            }
        }
        else if(type === quizTypes.ORDER) {
            var objects = div.find(".object").not(".destination");
            var answers = div.find("a.ans");
            correct = getCorrectOrder(objects, answers, force);
            div.find('.object').addClass("blocked");
        }
        else if(type === quizTypes.MATRIX_CHOICE) {
            var rows = div.find("tr");
            var answers = div.find("a.ans");
            correct = getCorrectMatrixChoice(rows, answers, force);
        }
        else if(type === quizTypes.HOTSPOT) {
            var hss = div.find('.hotspot');
            var gesucht = div.find('.gesucht').html();
            var answer = div.find('a.ans').filter('[id="'+gesucht+'"]');
            correct = getCorrectHotspot(div, hss, answer, force);
            hss.filter('.act').removeClass('act');
            if(correct !== -1 && correct !== true && correct !== 2) return;
        }
        else if(type === quizTypes.PETRI) {
            correct = processPetri(div, force);
            if(div.is(".unbewertet")) {
                deleteLabelColoring(div);
                div.find('.feedback').hide();
            }
            if(!correct) {
                // unbewertete Frage - Kein labelColoring
                return;
            }
        }
        else if(type === quizTypes.DRAW) {
            processDrawing(div);
        }
    }

    if(correct == -1 && force === true) {
        correct = false;
    }

    if(correct === -1) {
        deleteLabelColoring(labels);
        div.children("div.feedback").filter(".correct").hide();
        div.children("div.feedback").filter(".incorrect").hide();
        div.children("div.feedback").filter(".information").hide();
        div.children("div.feedback").filter(".noselection").show();
        return;
    }
    else if(div.is(".unbewertet")) {
        deleteLabelColoring(div);
        div.children("div.feedback").filter(".noselection").hide();
        div.children("div.feedback").filter(".correct").hide();
        div.children("div.feedback").filter(".incorrect").hide();
        div.children("div.feedback").filter(".information").show();
    }
    else if(correct === true) {
        div.children("div.feedback").filter(".noselection").hide();
        div.children("div.feedback").filter(".incorrect").hide();
        div.children("div.feedback").filter(".information").hide();
        div.children("div.feedback").filter(".correct").show();
    }
    else if(correct === false) {
        div.children("div.feedback").filter(".noselection").hide();
        div.children("div.feedback").filter(".correct").hide();
        div.children("div.feedback").filter(".information").hide();
        div.children("div.feedback").filter(".incorrect").show();
    }
    // hide all (hotspot, petri when finished)
    else if(correct === 2) {
        div.children("div.feedback").filter(".noselection").hide();
        div.children("div.feedback").filter(".correct").hide();
        div.children("div.feedback").filter(".incorrect").hide();
        div.children("div.feedback").filter(".information").show();
    }

    quizJS.blockQuestion(div);

    div.addClass("answered");
    div.next("button.quizButton").hide();

    if(!div.is('.reset_blocked')) div.nextUntil("div").filter("button.quizButton.weiter").show();
};



/**
* Liest für ein <div> alle als korrekt angegebenen Antworten aus.
* Diese sollten MD5 Verschlüsselt sein.
*/
function elementsToTextArray(ans) {
    var c = [];
    ans.each(function(i) {
        c[c.length] = $(this).html();
    });
    return c;
};


/**
* Gibt zurück, ob die Frage richtig beantwortet wurde bei einer Radio-Type-Frage.
* -1 Falls keine Antwort ausgewählt.
* @param labels      - alle labels die in der Frage vorkommen
* @param c           - alle korrekten Antworten. Ein Array, dass die aus <a class="ans></a> jeweiligen MD5 Verschlüsselten Antworten beinhaltet.
* @param colorLabels - true, Labels automatisch je nach korrektheit gefärbt werden sollen.
*                            Es werden alle Antworten die richtigen Antworten auf die Frage grün gefärbt.
*                            Fälschlicherweise angekreute Antworten werden rot markiert. Falsche und nicht angekreuzte Antworten bleiben weiß.
*/
function getCorrectForRadio(labels, c, colorLabels, force) {
    var correct = true;
    var numberofchecked = 0;
    labels.each(function(i) {
        var input = $(this).find('input');
        var correctAnswer = contains(c, encryptMD5(input.val()));

        if(input.is(':checked')) {
            numberofchecked++;
        }

        // wrong answer
        if(correctAnswer != input.is(':checked')) {
            correct = false;
        }
        // correct answer
        else {

        }

        // should be checked
        if(correctAnswer){
            $(this).addClass("right_icon");

            if(input.is(':checked')) $(this).addClass("right");
            else $(this).addClass("wrong");
        }
        // should not be checked
        else {
            $(this).addClass("wrong_icon");

            if(input.is(':checked')) $(this).addClass("wrong");
            else $(this).addClass("right");
        }
    });
    if(numberofchecked === 0 && !force) {
        correct = -1;
    }
    return correct;
};


/**
* Gibt zurück, ob die eingegebene Antwort zu den korrekten gehört.
* -1 falls Textfeld leer.
*/
function getCorrectForText(labels, c, force) {
    var correct = true;
    var ans = labels.children('input').val().trim();
    ans = encryptMD5(ans);
    if(!contains(c, ans)) {
        correct = false;
    }
    if(labels.children('input').val().length == 0 && !force) {
        correct = -1;
    }

    if(correct) {
        labels.addClass("right");
        labels.addClass("right_icon");
    }
    else {
        labels.addClass("wrong");
        labels.addClass("wrong_icon");
    }
    return correct;
};

/**
* Lücken Text mit Textfeldern
*
* -1 falls nicht alle ausgefüllt
*/
function getCorrectFillBlank(labels, answers, force) {
    var correct = true;

    labels.each(function(i, e) {
        var input = $(this).find("input");
        var id = input.attr("id");

        // alle richtigen antworten zu der ID
        var cor = elementsToTextArray(answers.filter("#"+id));
        var ans = encryptMD5(input.val().trim());

        // nicht ausgefüllt
        if(input.val().length == 0 && !force) {
            correct = -1;
            deleteLabelColoring($(this).closest('.question'));
            return false;
        }

        // antwort richtig
        if(contains(cor, ans) || cor.length == 0) {
            $(this).addClass("right");
            $(this).addClass("right_icon");
        }
        // antwort falsch
        else if(!contains(cor, ans)) {
            correct = false;
            $(this).addClass("wrong");
            $(this).addClass("wrong_icon");
        }
    });

    return correct;
}


/**
* Lücken Text mit Select
*
* kann nicht unbeantwortet sein
*/
function getCorrectFillBlankChoice(labels, answers, force) {
    var correct = true;

    labels.each(function(i, e) {
        var select = $(this).find("select");
        var id = select.attr("id");

        // alle richtigen antworten zu der ID
        var cor = elementsToTextArray(answers.filter("#"+id));
        var ans = encryptMD5(select.val());

        // antwort richtig
        if(contains(cor, ans) || cor.length == 0) {
            $(this).addClass("right");
            $(this).addClass("right_icon");
        }
        // antwort falsch
        else if(!contains(cor, ans)) {
            correct = false;
            $(this).addClass("wrong");
            $(this).addClass("wrong_icon");
        }
    });

    return correct;
}


/**
* Fehlertext. markierbare Wörter
*
* Kann nicht unausgefüllt sein
*/
function getCorrectErrorText(buttons, c, force) {
    var correct = true;

    buttons.each(function(i, e) {
        var ans = encryptMD5($(this).text());

        var act = $(this).is(".act");

        // Wort markiert und in Antworten enthalten
        if((contains(c, ans) && act)
            || (!contains(c, ans) && !act)) {
            // richtig
            $(this).closest('label').addClass("right");
            $(this).closest('label').addClass("right_icon");
        }
        // Nicht markiert oder nicht in Antworten
        else if(!contains(c, ans) ^ !act) {
            // falsch
            correct = false;
            $(this).closest('label').addClass("wrong");
            $(this).closest('label').addClass("wrong_icon");
        }
    });

    return correct;
}


/**
* Zuordnung
*
* -1 falls eines der Ziele nicht gefüllt
*/
function getCorrectClassification(dests, answers, force) {
    var correct = true;

    // nicht min. 1 platziert
    if(dests.filter('.full').length == 0 && answers.length != 0 && !force) {
        correct = -1;
        deleteLabelColoring($(this).closest('.question'));
        return correct;
    }

    dests.each(function(i, e) {
        var dest = $(this);
        var id = dest.attr("id");

        // alle richtigen antworten zu der ID
        var cor = elementsToTextArray(answers.filter("#"+id));

        var ans = encryptMD5(dest.children().attr("id"));

        // antwort richtig
        if(contains(cor, ans) || cor.length == 0) {
            $(this).addClass("right");
            $(this).addClass("right_icon");
        }
        // antwort falsch
        else if(!contains(cor, ans)) {
            correct = false;
            $(this).addClass("wrong");
            $(this).addClass("wrong_icon");
        }
    });

    return correct;
}


/**
* Reihenfolge
*
* Kann nicht unausgefüllt sein
*/
function getCorrectOrder(objects, answers, force) {
    var correct = true;
    var index = 0;

    objects.each(function(i, e) {
        var obj = $(this);
        var id = obj.children().attr("id");
        var cor = answers.filter("#"+id).text();

        // check if found object is in correct position
        // correct position is same or next active index

        // same position
        if(encryptMD5(""+index) == cor) {
            $(this).addClass("right");
            $(this).addClass("right_icon");
        }
        // antwort richtig
        else if(encryptMD5(""+(index+1)) == cor) {
            index++;
            $(this).addClass("right");
            $(this).addClass("right_icon");
        }
        // antwort falsch
        else {
            correct = false;
            $(this).addClass("wrong");
            $(this).addClass("wrong_icon");
        }
    });

    return correct;
}

/**
* Matrix (single/multiple) choice
*
* -1 wenn nicht in jeder Zeile mindest eines ausgewählt
*/
function getCorrectMatrixChoice(rows, answers, force) {
    var correct = true;

    rows.each(function(i, e) {
        var row = $(this);
        var id = row.attr("id");
        var cor = elementsToTextArray(answers.filter("#"+id)); // Mehrere Antworten können vorhanden sein

        var inputs = row.find("input"); // alle Inputs der Zeile

        // keines ausgewählt in einer Zeile
        if(inputs.length > 0 && inputs.filter(':checked').length == 0
            && !force) {
            correct = -1;
            deleteLabelColoring($(this).closest('.question'));
            return false;
        }

        inputs.each(function(ii, ee) {
            var ans = $(rows.find(".antwort").get(ii)).attr("id");
            ans = encryptMD5(ans);

            // ausgewählt und richtig oder nicht ausgewählt und nicht richtig (insg richtig)
            if(($(ee).is(":checked") && contains(cor, ans))
                || (!$(ee).is(":checked") && !contains(cor, ans))) {
            }
            // falsch
            else {
                correct = false;
            }

            // should be checked
            if(contains(cor, ans)) {
                $(this).closest('label').addClass("right_icon");

                if($(ee).is(":checked")) $(this).closest('label').addClass("right");
                else $(this).closest('label').addClass("wrong");
            }
            // should not be checked
            else {
                $(this).closest('label').addClass("wrong_icon");

                if($(ee).is(":checked")) $(this).closest('label').addClass("wrong");
                else $(this).closest('label').addClass("right");
            }
        });
    });

    return correct;
}


function getCorrectHotspot(div, hss, answer, force) {
    var finished = false;

    // nichts ausgewählt
    if(hss.filter('.act').length == 0 && !force) {
        return -1;
    }
    else {
        var ans = hss.filter('.act').attr('id');
        ans = encryptMD5(ans);

        var correct = ans == answer.html();
        var cl = "cor";
        if(!correct) cl = "inc";

        hss.filter('.act').find('.descr').append("<div class='"+cl+"'>"
                                                    + div.find('.gesucht').html()
                                                    + "</div>");

        if(!div.is('.unbewertet')) {
            if(correct) {
                div.children("div.feedback").filter(".noselection").hide();
                div.children("div.feedback").filter(".incorrect").hide();
                div.children("div.feedback").filter(".correct").show();
            }
            else {
                div.children("div.feedback").filter(".noselection").hide();
                div.children("div.feedback").filter(".correct").hide();
                div.children("div.feedback").filter(".incorrect").show();
            }
        }


        finished = !hotspotNextObject(div);

        if(finished) {
            findCorrectsHotspot(div);
            // for information show
            finished = 2;
        }
    }
    return finished;
}


function getCorrectPetri(div, places, answers, force) {

    // nichts ausgewählt
    if(places.filter('.act').length == 0 && !force) {
        return -1;
    }
    else {
        correct = true;
        var ans_id = div.find('.petri_image').find('img:visible').attr('id');
        var c = elementsToTextArray(answers.filter('#'+ans_id));

        places.each(function(i,e) {
            var ans = $(this).attr('id');
            ans = encryptMD5(ans);

            // markiert und richtig
            if(($(this).is(".act") && contains(c, ans))
                || (!$(this).is(".act") && !contains(c, ans))) {
                $(this).addClass("right");
                $(this).addClass("right_icon");
            }
            else {
                correct = false;
                $(this).addClass("wrong");
                $(this).addClass("wrong_icon");
            }
        });

        if(correct) {
            div.children("div.feedback").filter(".noselection").hide();
            div.children("div.feedback").filter(".incorrect").hide();
            div.children("div.feedback").filter(".correct").show();
        }
        else {
            div.children("div.feedback").filter(".noselection").hide();
            div.children("div.feedback").filter(".correct").hide();
            div.children("div.feedback").filter(".incorrect").show();
        }

        div.addClass("show_feedback");
    }
    return false;
}

// --------------------------------------------------------------------------------------
// PROCESS ANSWER
// --------------------------------------------------------------------------------------


function processFreeText(div) {
    // do nothing
}

/**
* Verarbeiten des "Lösen" Knopfes in einer Petri-Netz Aufgabe
*/
function processPetri(div, force) {
    var places = div.find('.place');

    var correct = 0;

    // after answer
    if(div.is('.show_feedback')) {
        div.removeClass("show_feedback");
        petriNextPart(div);
        if(petriFinished(div)) {
            // for information show
            correct = 2;
        }
        else {
            deleteLabelColoring(places);
            places.filter('.act').removeClass('act');
            correct = false;
        }
    }
    // before answer - when answering
    else {
        var answers = div.find('a.ans');
        correct = getCorrectPetri(div, places, answers, force);
        if(correct != -1) {
            petriShowCorrectBG(div);
            correct = false;
        }
    }

    return correct;
}

function processDrawing(div) {
    div.find('.drawing_canvas_container').addClass("blocked");
}

// --------------------------------------------------------------------------------------

function finishQuestion(div) {
    var try_count = 50;
    while(!div.is(".answered") && try_count > 0) {
        submitAns(div.next('button'), true);
        try_count -= 1;
    }
}



// --------------------------------------------------------------------------------------
// CHOICE
// --------------------------------------------------------------------------------------

// changes type to multiple/single if .answers has class .multiple or .single
function initiateChoice() {
    var root = $('[qtype="'+quizTypes.CHOICE+'"]');

    root.each(function(i,e) {
        var div = $(this);

        var ans = div.find('.answers');

        if(ans.is('.multiple')) {
            ans.find('input').attr("type", "checkbox");
        }
        else if(ans.is('.single')) {
            ans.find('input').attr("type", "radio");
        }

        ans.find('input').attr("name", "choice_" + i);

        ans.find('input').each(function(ii,ee) {
            var input = $(ee);
            if(input.attr('val') != undefined) {
                input.val(input.attr('val'));
                input.attr('val', "");
            }
        });
    });
}


// --------------------------------------------------------------------------------------
// FREE TEXT
// --------------------------------------------------------------------------------------

function initiateFreeText() {
    var root = $('[qtype="'+quizTypes.FREE_TEXT+'"]');

    root.addClass("unbewertet");
}


// --------------------------------------------------------------------------------------
// ERROR TEXT (Buttons)
// --------------------------------------------------------------------------------------

function initiateErrorText() {
    var root = $('[qtype="'+quizTypes.ERROR_TEXT+'"]');

    root.find('.error_button').wrap("<label></label>");
}

// --------------------------------------------------------------------------------------
// MATRIX
// --------------------------------------------------------------------------------------

function initiateMatrix() {
    var root = $('[qtype="'+quizTypes.MATRIX_CHOICE+'"]');

    root.find('input').wrap("<label></label>");

    // for each question
    root.each(function(i,e) {
        var div = $(this);

        var ans = div.find('.answers');

        var type = "checkbox";
        if(ans.is(".single") || ans.find('input[type="radio"]').length > 0) {
            type = "radio";
        }

        // check row and fill with TD
        var rows = ans.find('tr');
        rows.each(function(ii,ee) {
            if(ii === 0) return true;

            var row = $(ee);

            // append td's
            while((row.find('td').length + row.find('th').length)
                < (rows.first().find('td').length + rows.first().find('th').length)) {
                row.append('<td><label><input/></label></td>');
            }

            // set name for each row
            row.find('input').attr("name", "choice_" + i + "_row_" + ii);
        });

        // set type
        ans.find('input').attr("type", type);
    });
}

// --------------------------------------------------------------------------------------
// DRAG AND DROP FUNCTIONS
// --------------------------------------------------------------------------------------




var draggedObjects = null;
var startedObject = null;

// CLASSIFICATION

/**
* Jedes Object kann gedragt und gedropt werden in jedem Object.
*/
function addDragAndDropToClassification() {
    var root = $('[qtype="'+quizTypes.CLASSIFICATION+'"]');
    root.find('.object').attr("draggable", "true");
    root.find('.object').on("dragstart", function(event) {
        dragObject(event.originalEvent);
    });
    root.find('.object').on("dragover", function(event) {
        allowObjectDrop(event.originalEvent);
    });
    root.find('.object').on("drop", function(event) {
        dropObject(event.originalEvent);
    });

    root.find('.object').on("dragend", function(event) {
        dragReset(event.originalEvent);
    });

    root.find('.object').on("dragenter", function(event) {
        draggedOver(event.originalEvent);
    });
    root.find('.object').on("dragleave", function(event) {
        draggedOut(event.originalEvent);
    });

    // mobile unterstützung / Klick-Fallback. Auch am Desktop möglich
    root.find('.object').on("click", function(event) {
        if(startedObject == null) {
            dragObject(event.originalEvent);
        }
        else {
            dropObject(event.originalEvent);
            dragReset(event.originalEvent);
        }
    });

}


// ORDER

function addDragAndDropToOrderObjects() {
    var root = $('[qtype="'+quizTypes.ORDER+'"]');
    root.find('.object').attr("draggable", "true");
    root.find('.object').on("dragstart", function(event) {
        dragObject(event.originalEvent);
    });

    root.find('.object').on("dragend", function(event) {
        dragReset(event.originalEvent);
    });


    // mobile unterstützung / Klick-Fallback. Auch am Desktop möglich
    root.find('.object').on("click", function(event) {
        if(startedObject == null) {
            dragObject(event.originalEvent);
        }
        else {
            dragReset(event.originalEvent);
        }
    });

    addDragAndDropToOrderDestinations(root);
}

function addDragAndDropToOrderDestinations(root) {
    root.find('.object').after(
        "<div class='object destination'></div>");
    root.find('.object').first().before(
        "<div class='object destination'></div>");

    root.find('.destination').on("dragover", function(event) {
        allowObjectDrop(event.originalEvent);
    });
    root.find('.destination').on("drop", function(event) {
        dropObject(event.originalEvent);
    });

    root.find('.destination').on("dragend", function(event) {
        dragReset(event.originalEvent);
    });

    root.find('.destination').on("dragenter", function(event) {
        draggedOver(event.originalEvent);
    });
    root.find('.destination').on("dragleave", function(event) {
        draggedOut(event.originalEvent);
    });

    // mobile unterstützung / Klick-Fallback. Auch am Desktop möglich
    root.find('.destination').on("click", function(event) {
        if(startedObject == null) {
        }
        else {
            dropObject(event.originalEvent);
            dragReset(event.originalEvent);
        }
    });
}


// DRAG & DROP --------------------------


/**
* Fügt dem Datentransfer alle zu verschiebenen Objekte hinzu
*/
function dragObject(e) {
    // get type
    var type = $(e.target).closest(".question").attr("qtype");

    var target = $(e.target).closest('.object')[0];

    // für firefox notwendig, sonst startet drag nicht
    // try da Microsoft edge sonst abbricht
    try {
        if(e.type === "dragstart") e.dataTransfer.setData("transer", "data");
    }
    catch(e) {
        // do nothing
    }

    if(type === quizTypes.CLASSIFICATION) {
        // Falls noch nicht benutzt
        if(!$(target).is(".used") && !$(target).is(".blocked")) {
            draggedObjects = $(target).children();
            startedObject = $(target);
            $(target).css("opacity", "0.4");
            $(target).css("background", "#888");
            $(target).closest(".answers").find(".destination").not(".full").addClass("emph");

            $(target).closest(".question").find(".object.used").each(function(i,e) {
                if($(this).children().attr("id") == draggedObjects.attr("id")) {
                    $(this).addClass("emph");
                }
            });
        }
        else {
            e.preventDefault();
        }
    }
    else if(type === quizTypes.ORDER) {
        if(!$(target).is(".blocked")) {
            startedObject = $(target);
            $(target).css("opacity", "0.4");
            $(target).css("background", "#888");
            setTimeout(function() {
                $(target).closest(".answers").find(".destination").addClass("vis");
                $(target).prev().removeClass("vis");
                $(target).next().removeClass("vis");

                // change height of destinations
                $(target).closest('.answers').find('.object.destination').css({
                    "min-height" : $(target).closest('.answers').find('.object').not('.destination').first().height() + "px",
                    "min-width": "5px"
                });
            }, 0);
        }
        else {
            e.preventDefault();
        }
    }

}


/**
* Verhindert Standardfunktionen
*/
function allowObjectDrop(e) {
    e.preventDefault();
}

/**
* Verschiebt alle Objekte in das Ziel
*/
function dropObject(e) {
    // get type
    var type = $(e.target).closest(".question").attr("qtype");

    var target = $(e.target).closest('.object')[0];

    if(type === quizTypes.CLASSIFICATION) {
        var dragBackToStart = draggedObjects.attr('id') == $(target).children().attr('id');

        // Ablegen an freiem Platz aus StartObjekt (!= Zielobjekt)
        if(!startedObject.is(".destination")
                && $(target).is(".object.destination")
                && $(target).is(".object")
                && !$(target).is(".full")
                && !$(target).is(".blocked")) {
            e.preventDefault();
            startedObject.addClass("used");
            $(target).append(draggedObjects.clone());
            $(target).addClass("full");
            dragReset();
        }
        // Ablegen an freiem Platz aus Zielobjekt (verschieben)
        else if(startedObject.is(".destination")
                && $(target).is(".object.destination")
                && !$(target).is(".full")
                && !dragBackToStart
                && !$(target).is(".blocked")) {
            startedObject.removeClass("full");
            $(target).append(draggedObjects);
            $(target).addClass("full");
            dragReset();
        }
        // Zurücklegen an ursprünglichen Ort
        else if($(target).is(".object") && $(target).is(".used")
            && dragBackToStart
            && !$(target).is(".blocked")) {
            startedObject.removeClass("full");
            draggedObjects.remove();
            $(target).removeClass("used");
            dragReset();
        }
    }
    else if(type === quizTypes.ORDER) {
        $(target).after(startedObject);

        var root = $(target).closest(".question");
        root.find(".destination").remove();

        addDragAndDropToOrderDestinations(root);
        dragReset();
    }
}

/**
* Setzt Sachen zurück die während des Dragvorgangs verwendet werden.
*/
function dragReset(e) {
    // remove emphasis
    if(e != undefined) $(e.target).closest(".answers").find(".emph").removeClass("emph");

    $('.draggedover').removeClass("draggedover");
    $(".object").css("opacity", "");
    $(".object").css("background", "");
    $('.question[qtype="'+quizTypes.ORDER+'"]').find(".destination").removeClass("vis");
    draggedObjects = null;
    startedObject = null;
}

function draggedOver(e) {
    var target = $(e.target).closest('.object')[0];
    // Leer oder zurücklegen zur Ursprungsort
    if(!$(target).is(".full")
        || draggedObjects == $(target).children()) $(target).addClass("draggedover");
}

function draggedOut(e) {
    var target = $(e.target).closest('.object')[0];
    // Leer oder zurücklegen zur Ursprungsort
    if(!$(target).is(".full")
        || draggedObjects == $(target).children()) $(target).removeClass("draggedover");
}




// --------------------------------------------------------------------------------------
// HOTSPOT
// --------------------------------------------------------------------------------------

var activeElement = 0;

function initiateHotspotImage() {
    var root = $('[qtype="'+quizTypes.HOTSPOT+'"]');

    // Descr (richtige und falsche antworten) hinzufügen
    root.find('.hotspot').append('<div class="descr"></div>')

    // hover funktionen
    root.find('.hotspot').mouseover(function(event) {
        if($(this).find('.descr').children().length > 0) $(this).find('.descr').show();
        calculateHotspotDescriptions($(this).closest('[qtype="'+quizTypes.HOTSPOT+'"]'));
    });
    root.find('.hotspot').mouseout(function(event) {
        $(this).find('.descr').hide();
    });


    // Klicken auf Hotspot
    root.find('.hotspot').click(function() {
        hotspotClick($(this));
    });


    // zeigt erstes gesuchtes objekt in .gesucht an
    root.each(function(i,e) {
        hotspotNextObject($(e));
    });

    // berechnet Größe der Hotspots
    calculateHotspotDimensions();
}


function hotspotClick(hs) {
    if(!hs.is('.blocked')) {
        hs.closest('[qtype="'+quizTypes.HOTSPOT+'"]').find('.hotspot').removeClass("act");
        hs.addClass("act");
    }
}

/**
* Setzt in .gesucht das nächste Gesuchte Objekt ein
* gibt zurück ob ein nicht beantwortetes Objekt gefunden wurde (bool)
*/
function hotspotNextObject(root) {
    var doShuffle = root.find('.hotspot_image').is('.shuffle');

    var ans = root.find('a.ans').not('.used');
    if(doShuffle) {
        shuffle(ans);
    }

    root.find('.gesucht').html(ans.first().attr('id'));
    ans.first().addClass("used");

    return ans.length > 0;
}

function calculateHotspotDimensions() {
    var root = $('[qtype="'+quizTypes.HOTSPOT+'"]');

    root.each(function(i, e) {
        calculateHotspotDimension($(e));
    });
}

function calculateHotspotDimension(question) {
    if(!question.is('[qtype="'+quizTypes.HOTSPOT+'"]')) return;
    var imgWidth = question.find('.hotspot_image').width();
    var width = imgWidth * 0.05;

    question.find('.hotspot_image').find('.hotspot').css({
        "width" : width + "px",
        "height" : width + "px",
        "margin-top": "-" + (width/2) + "px",
        "margin-left": "-" + (width/2) + "px"
    });
}

function calculateHotspotDescriptions(root) {
    var descr_margin = {
        top : 5,
        left : 0
    };

    root.each(function(i, e) {
        var imgWidth = root.find('.hotspot_image').width();
        var width = imgWidth * 0.05;


        var hs_img = $(e).find('.hotspot_image').find('img');

        var hss = $(e).find('.hotspot_image').find('.hotspot');

        hss.each(function(i,e) {
            hs = $(e);
            if(hs.find('.descr').length > 0) {
                var hs_width = hs.width();
                var des_width = hs.find('.descr').outerWidth();
                var des_height = hs.find('.descr').outerHeight();

                var top = (hs_width + descr_margin.top) + "px";
                var left = 0;

                // zu hoch um darunter angezeigt zu werden
                if((hs.offset().top
                    - hs_img.offset().top
                    + hs_width
                    + des_height
                    + descr_margin.top)
                    > hs_img.height()) {
                    top = "-" + (des_height + descr_margin.top) + "px";
                }

                // zu breit um nach rechts angezeigt zu werden
                if((hs.offset().left
                    - hs_img.offset().left
                    + hs_width
                    + des_width
                    + descr_margin.left)
                    > hs_img.width()) {
                    left = "-" + (des_width - hs_width - descr_margin.left) + "px";
                }

                hs.find('.descr').css({
                    "top" : top,
                    "left" : left
                });
            }
        });
    });
}

function blockHotspot(div) {
    div.find('.hotspot').addClass('blocked');
}


function findCorrectsHotspot(div) {
    var hss = div.find('.hotspot');
    var ans = div.find('a.ans');

    hss.each(function(i,e) {
        var hs = $(e);
        // bisher nicht korrekt
        if(hs.find('.cor').length == 0) {
            var id = hs.attr("id");
            var enc = encryptMD5(id);

            ans.each(function(ii, ee) {
                // korrekte antwort
                if($(ee).html() == enc) {
                    hs.find('.descr').prepend("<div class='cor'>"+$(ee).attr("id")+"</div>");
                }
            });
        }
    });
}



// ---------------------------------- PETRI IMAGE --------------------------------------

function initiatePetriImage() {
    var root = $('[qtype="'+quizTypes.PETRI+'"]');

    root.each(function(i,e) {
        var div = $(this);


        div.find('.petri_image').find('img').hide();
        div.find('.petri_image').find('img').first().show();

        div.find('.petri_aufgabe').find('img').hide();
        div.find('.petri_aufgabe').find(
            '#'+div.find('.petri_image').find('img').first().attr("id")).show();

        div.find('.gesucht').html(div.find('.petri_image').find('img').first().attr("task"));

        // Klicken auf Hotspot
        div.find('.place').click(function() {
            petriClick($(this));
        });

        // berechnet Größe der Plätze
        calculatePetriDimensions();
    });
}


function petriClick(element) {
    var div = element.closest('.question');
    if(!element.is(".blocked") && !div.is('.show_feedback')) {
        if(element.is(".act")) {
            element.removeClass("act");
        }
        else {
            element.addClass("act");
        }
    }
}

function petriShowCorrectBG(div) {
    var imgs = div.find('.petri_image').find('img.correct');

    var act_img = div.find('.petri_image').find('img:visible');

    var cor_img = imgs.filter('#'+act_img.attr('id'));

    if(cor_img.length > 0) {
        act_img.hide();
        cor_img.show();
    }
}

function petriNextImage(div) {
    var imgs = div.find('.petri_image').find('img').not('.correct');

    var act_img = div.find('.petri_image').find('img:visible');

    var idx = imgs.index(imgs.filter('#'+act_img.attr("id")));

    if(imgs.length > idx + 1) {
        next_img = $(imgs.get(idx+1));

        act_img.hide();
        next_img.show();
    }
}

function petriNextAufgabenImage(div) {
    div.find('.petri_aufgabe').find('img').hide();
    div.find('.petri_aufgabe').find('#'+div.find('.petri_image').find('img:visible').attr("id")).show();
}

function petriNextPart(div) {
    div.find('.feedback').hide();
    petriNextImage(div);
    petriNextAufgabenImage(div);
    div.find('.gesucht').html(div.find('.petri_image').find('img:visible').attr("task"));
}

function petriFinished(div) {
    var finished = false;

    var act_img = div.find('.petri_image').find('img:visible');

    var idx = div.find('.petri_image').find('img').index(act_img);

    if(idx >= div.find('.petri_image').find('img').length - 1) {
        finished = true;
    }

    return finished;
}

function blockPetri(div) {
    div.find('.place').addClass("blocked");
}


function calculatePetriDimensions() {
    var root = $('[qtype="'+quizTypes.PETRI+'"]');

    root.each(function(i, e) {
        calculatePetriDimension($(e));
    });
}

function calculatePetriDimension(question) {
    if(!question.is('[qtype="'+quizTypes.PETRI+'"]')) return;
    var imgWidth = question.find('.petri_image').width();
    var width = imgWidth * 0.05;

    question.find('.petri_image').find('.place').css({
        "width" : width + "px",
        "height" : width + "px",
        "margin-top": "-" + (width/2) + "px",
        "margin-left": "-" + (width/2) + "px"
    });
}


// --------------------------------------------------------------------------------------

/**
* Streicht das Wort durch oder entfernt den Strich beim Draufklicken.
*/
function toggleErrorButton(button) {
    if(!$(button).parent().parent().is(".answered")) {
        if($(button).is(".act")) {
            $(button).removeClass("act");
        }
        else {
            $(button).addClass("act");
        }
    }

}


/**
* Entfernt für alle übergebenen Labels die färbenden Klassen "right" und "wrong"
*/
function deleteLabelColoring(div) {
    div.removeClass('right');
    div.removeClass('wrong');
    div.find('.right').removeClass('right');
    div.find('.wrong').removeClass('wrong');
    div.removeClass('right_icon');
    div.removeClass('wrong_icon');
    div.find('.right_icon').removeClass('right_icon');
    div.find('.wrong_icon').removeClass('wrong_icon');
};

/**
* Gibt zurück, ob val in dem array vorhanden ist.
* Es wird auch auf Typ-Gleichheit geprüft.
*/
function contains(array, val) {
    var found = false;
    for(var i=0; i<array.length; i++) {
        if(array[i] === val) {
            found = true;
        }
    }
    return found;
};



var quizTimer = null;

/**
* initialisiert Timer für alle Aufgaben die welche haben
* Sollte nur einmal zu Beginn aufgerufen werden
*/
function initTimers() {
    $('.question').each(function(i, e) {
        const el = $(e);

        // add unique question id if not set
        if(!el.attr('question-id')) {
            el.attr('question-id', nextQuestionId);
            nextQuestionId++;
        }
        const qId = el.attr('question-id');

        // will work in FireFox, Chrome Engine Browsers, Edge
        try {
            var options = {
                root: document.body,
                rootMargin: '0px',
                threshold: 1.0
            }

            var observer = new IntersectionObserver(function(entries, observer) {
                for(var entry of entries) {
                    quizVisibilityUpdate($(entry.target));
                }
            }, options);

            observer.observe(el.get(0));
        } catch(e) {
            // ignore;
        }
        // resizesensor as visibility listener this will only work with Chrome engine browsers
        try {
            new ResizeSensor(el, function(dim) {
                quizVisibilityUpdate(el);
            });
        } catch(e) {
            // ignore;
        }

        quizVisibilityUpdate(el);

        // add starttime
        var max_time = el.attr("max-time");
        if(max_time != undefined && max_time.length != 0) {
            max_time = parseInt(max_time);
            el.find('.answered_hint.timer').remove();
            el.find("h4").after("<div class='answered_hint timer'>"
                            + max_time + ":00</div>");
        }
    });

    updateTimers();

    return;
}

function quizVisibilityUpdate(question) {
    const qId = question.attr('question-id');

    if(question.is(':visible') !== questionVisibility[qId]
        || questionVisibility[qId] == undefined) {
        questionVisibility[qId] = question.is(':visible');
        // was set to visible
        if(questionVisibility[qId]) {
            // update start time, so further time calculation is correct
            if(start_time[qId] != undefined
                    && passed_time[qId] != undefined) {
                start_time[qId] = Date.now() - passed_time[qId]*1000;
            }
            // set new start_time and passed_time
            else {
                start_time[qId] = new Date();
                passed_time[qId] = 0;
            }
        }
    }
}

function updateQuestionVisibility() {
    $('.question').each(function(i, e) {
        const el = $(e);
        quizVisibilityUpdate(el);
    });
}

/**
* Aktualisieren aller Timer
*/
function updateTimers() {
    $('.question .answered_hint.timer:visible').each(function(i, e) {
        const timer = $(e);
        const question = timer.closest('.question');
        const qId = question.attr('question-id');

        if(!questionVisibility[qId]
            || start_time[qId] == undefined
            || question.is('.answered')) return true;

        var diff = (Date.now() - start_time[qId])/1000;
        passed_time[qId] = diff;

        // time in seconds
        var time = parseInt(question.attr("max-time")) * 60;
        var time_left = time - diff;

        if(time_left > 0) {
            var min = Math.floor(time_left/60);
            var sec = Math.floor(time_left - min*60);
            if(sec < 10) {
                sec = "0" + sec;
            }
            timer.html(min + ":" + sec);
        }
        else if(!question.is('.answered')) {
            finishQuestion(question);
            quizJS.blockQuestion(question);
            question.find('.feedback.noselection').hide();

            question.append("<div class='feedback timeup'>Die Zeit ist abgelaufen. Die Frage wurde automatisch beantwortet und gesperrt.</div>");

            if(quizJS.timerAlertActive) {
                alert(quizJS.timerAlertText);
            }
        }
    });

    clearTimeout(quizTimer);
    quizTimer = setTimeout(function() { updateTimers(); }, 1000);
}


/**
* Mischt die Antwortenreihenfolge bei dafür markierten Fragen.
*/
function shuffleAnswers() {
    $("div.answers").filter(".shuffle").each(function(i) {
        var labels = $(this).children("label");
        shuffle(labels);
        $(labels).remove();
        $(this).append($(labels));
        $(this).removeClass("shuffle");
    });
}

/**
* Ersetzt alle Inputs mit "rnd" als Value und %rnd im Text durch Werte aus dem vorgegebenem Wertebereich.
*/
function replaceRandoms() {
    $("div.answers").filter(".rnd").each(function(i) {
        var bereich = $(this).attr('class').replace("answers", "").replace("rnd","").replace("shuffle","").replace(/\s+/, "");
        var min = parseInt(bereich.split("-")[0]);
        var max = parseInt(bereich.split("-")[1]);
        var mul = parseInt(bereich.split("-")[2]);
        var inputs = $(this).children("label").children("input").filter(".rnd");
        var ohneZahlen = [];
        $(this).children("label").children("input").not(".rnd").each(function(j,c) {
            ohneZahlen[ohneZahlen.length] = parseInt($(c).val())/mul;
        });
        var randoms = zufallsArray(ohneZahlen, inputs.length, min, max);
        $(inputs).each(function(j, c) {
            $(this).removeClass("rnd");
            $(this).val(randoms[j]*mul);
            $(this).parent().html($(this).parent().html().replace("%rnd", randoms[j]*mul));
        });
        $(this).removeClass("rnd");
        $(this).removeClass(bereich);
    });
}

/**
    Gibt eine ganze Zufallszahl zwischen der unteren und oberen Grenze (beide enthalten) zurück.
*/
function randomInt(untereGrenze, obereGrenze) {
    var x = Math.floor((Math.random() * (obereGrenze-untereGrenze+1)) + untereGrenze);
    return x;
}

/**+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0] */
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

/**
    Gibt ein Array zurück mit 'anzahl' Zufallszahlen zwischen untereG. und obereG. ohne die 'ohneZahl'
*/
function zufallsArray(ohneZahlen, anzahl, untereGrenze, obereGrenze) {
    var zufallArray = [];
    var x=0;
    do{
        x=randomInt(untereGrenze, obereGrenze);
        if($.inArray(x, zufallArray) == -1 && $.inArray(x, ohneZahlen) == -1) zufallArray[zufallArray.length] = x;
    } while(zufallArray.length < anzahl);
    return zufallArray;
}



/**
* Bricht die Antworten in neue Zeile unter das Bild, falls das Bild mehr als 60%
* der Breite einnimmt oder die Antworten mehr als 2 mal so hoch wie das Bild sind.
*/
function windowResizing() {
    $('div.question').each(function(i, e) {
        resizeQuestion($(e));
    });
}

function resizeQuestion(question) {
    var maxWidth = 0;
    var maxHeight = 0;
    question.children('img').each(function() {
        maxWidth = Math.max(maxWidth, question.width());
        maxHeight = Math.max(maxHeight, question.outerHeight());
    });


    if(maxWidth*100/$('.question:visible').width() > 80 || $('.question:visible').children('div.answers').outerHeight() > 2*maxHeight) {
        question.children('img').css("float", "none");
        question.children('div.answers').css("padding-left", "0");
    }
    else {
        question.children('img').css("float", "left");
        question.children('div.answers').css("padding-left", maxWidth + "px");
    }

    calculateHotspotDimension(question);
    calculatePetriDimension(question);
    calculateCanvasDimension(question);
}


/**
* Setzt eine Frage auf den Anfangszustand zurück
*/
function resetQuestion(div) {
    div.removeClass("answered");
    div.find(".feedback").hide();
    deleteLabelColoring(div);

    div.find("input:text").val("");
    div.find("input:radio").prop("checked", false);
    div.find("input:checkbox").prop("checked", false);

    div.find('textarea').attr('readonly', false);
    div.find('textarea').val("");
    div.find("select").attr("disabled", false);
    div.find("input").attr("disabled", false);

    // Zuordnung (Classfication)
    div.find('.used').removeClass("used");
    div.find('.full').children().remove();
    div.find('.full').removeClass("full");

    // alle geblockten elemente (mehrfach benutzt)
    div.find('.blocked').removeClass("blocked");

    // alle aktiven elemente (mehrfach benutzt)
    div.find('.act').removeClass("act");

    // hotspot
    div.find('.hotspot').find('.descr').children().remove();

    // petrinetz
    div.find('.petri_image').find('img').hide();
    // erste aufgabe anzeigen
    div.find('.petri_image').find('img').first().show();
    div.filter('[qtype="'+quizTypes.PETRI+'"]').find('.petri_aufgabe').find('img')
        .filter('#'+div.find('.petri_image').find('img:visible').attr("id")).show();
    div.filter('[qtype="'+quizTypes.PETRI+'"]').find('.gesucht').html(div.find('.petri_image').find('img').first().attr("task"));

    resetCanvas(div);

    div.nextAll("button.quizButton").first().show();
    div.nextAll("button.quizButton.weiter").first().hide();
}

/**
* Setzt alle Fragen des Quiz' auf den Anfangszustand zurück.
*/
function resetQuiz() {
    $(".question").removeClass("answered");
    $(".feedback").hide();
    deleteLabelColoring($("label"));
    $("input:text").val("");
    $("input:radio").prop("checked", false);
    $("input:checkbox").prop("checked", false);

    $('.question').find('textarea').attr('readonly', false);

    $(".question").each(function() {
        resetQuestion($(this));
    });
}



/** **************************************************************************
*                                                                            *
*                                                                            *
*                             DRAWING CANVAS                                 *
*                                                                            *
*                                                                            *
******************************************************************************/
// Für jede Frage wird hinterlegt, welcher Canvas angezeigt wird
// genutzt für rückgängig/wiederholen Funktion
var canvasIndex = [];

/**
* Initialisiert alle DrawingCanvas Elemente. Für Jede Frage dieses Typs.
*/
function initiateDrawingCanvas() {
    var root = $('[qtype="'+quizTypes.DRAW+'"]');

    root.each(function(i,e) {
        var div = $(this);

        div.addClass("unbewertet");

        resetCanvas(div);

        // Container für zusätzliche Steuerelemente
        div.find('.drawing_canvas_container').after('<div class="button_container"></div>');

        // Rückgängig und Wiederholen
        if(!div.find('.drawing_canvas_container').is('.no_steps')) {
            div.find('.button_container').append('<button class="stepforw">Wiederholen</button><br>');
            div.find('.stepforw').click(function() {
                canvasStepForward(div.find('.drawing_canvas_container'));
            });

            div.find('.button_container').append('<button class="stepback">Rückgängig</button><br>');
            div.find('.stepback').click(function() {
                canvasStepBack(div.find('.drawing_canvas_container'));
            });
        }

        // Bild komplett löschen Button
        div.find('.button_container').append('<button class="clear">Löschen</button>');
        div.find('.clear').click(function() {
            resetCanvas(div);
        });

        calculateCanvasDimensions();
    });
}

/**
* Skaliert sichtbare Canvas auf aktuelle Größe
* Falls nötig werden dabei die canvas inhalte neu gezeichnet
*/
function calculateCanvasDimensions() {
    var root = $('[qtype="'+quizTypes.DRAW+'"]:visible');

    root.each(function(i,e) {
        calculateCanvasDimension($(e));
    });
}

function calculateCanvasDimension(div) {
    if(!div.is('[qtype="'+quizTypes.DRAW+'"]:visible')) return;
    div.find('canvas').each(function(ii,ee) {
        // canvas to scale
        var canvas = $(this);

        // clear prev. timeouts if existent
        if(this.redrawTimeout != undefined && this.redrawTimeout != null) {
            clearTimeout(this.redrawTimeout);
        }

        // create new timeout
        var timeout = setTimeout(function() {
            // clone before resize
            var oldCanvas = canvas[0];
            var newCanvas = document.createElement('canvas');
            var context = newCanvas.getContext('2d');
            newCanvas.width = oldCanvas.width;
            newCanvas.height = oldCanvas.height;
            context.drawImage(oldCanvas, 0, 0);

            // change dimensions
            canvas.attr("width", canvas.width());
            canvas.attr("height", canvas.height());

            // redraw frome cloned canvas
            oldCanvas.getContext('2d').drawImage(newCanvas, 0, 0, canvas.width(), canvas.height());
            $(newCanvas).remove();
        }, 100);

        // add this timeout to the element
        this.redrawTimeout = timeout;
    });
}

/**
* Stellt den Startzustand wieder her.
*
* alle <canvas> Elemente werden entfernt
* neuere original canvas wird erstellt und DrawingCanvas initialisiert
* canvasIndex wird zurückgesetzt.
* block wird aufgehoben
*/
function resetCanvas(div) {
    if(div.is('[qtype="'+quizTypes.DRAW+'"]')) {
        div.find('canvas').remove();
        div.find('.drawing_canvas_container').append('<canvas class="drawing_canvas act"></canvas>');
        createDrawingCanvas(div.find('.drawing_canvas_container').find('canvas'),
                            getCanvasStrokeColor(div));

        setCanvasIndex(div.find('.drawing_canvas_container'), 0);
        div.find('.drawing_canvas_container').removeClass(".blocked");
        calculateCanvasDimensions();
    }
}

/**
* Geht einen gezeichneten Schritt zurück
*
* Dazu wird der ältere Canvas wieder angezeigt und der canvasIndex angepasst
*/
function canvasStepBack(div) {
    var c_Idx = getCanvasIndex(div);

    var canvasList = div.find('canvas').not('#imageTemp');

    if(c_Idx > 0) {
        canvasList.removeClass("act");
        $(canvasList.get(c_Idx - 1)).addClass("act");
        setCanvasIndex(div, getCanvasIndex(div)-1);
    }
}

/**
* Wiederholt einen gezeichneten Schritt
*
* Dazu wird der neuere Canvas wieder angezeigt und der canvasIndex angepasst
*/
function canvasStepForward(div) {
    var c_Idx = getCanvasIndex(div);

    var canvasList = div.find('canvas').not('#imageTemp');

    if(c_Idx < canvasList.length - 1) {
        canvasList.removeClass("act");
        $(canvasList.get(c_Idx + 1)).addClass("act");
        setCanvasIndex(div, getCanvasIndex(div)+1);
    }
}

/**
* Gibt den aktuell angezeigten canvasIndex für ein .drawing_canvas_container Element zurück
*/
function getCanvasIndex(div) {
    var draw_can = $('[qtype="'+quizTypes.DRAW+'"]').find('.drawing_canvas_container');

    return canvasIndex[draw_can.index(div)];
}

/**
* Setzt den aktuell angezeigten canvasIndex auf idx für ein .drawing_canvas_container Element
*/
function setCanvasIndex(div, idx) {
    var draw_can = $('[qtype="'+quizTypes.DRAW+'"]').find('.drawing_canvas_container');

    canvasIndex[draw_can.index(div)] = idx;
}

/**
* Gibt einen Farbcode String zurück wie zB "#FF0000" für eine Zeichenaufgabe
*
* @param: div - das div.question[qtype=quizTypes.DRAW]
*/
function getCanvasStrokeColor(root) {
    var color = "#000000";

    var div = root.find('.drawing_canvas_container');

    if(div.is('.black')) {
        color = "#000000";
    }
    else if(div.is(".red")) {
        color = "#FF0000";
    }
    else if(div.is(".green")) {
        color = "#00FF00";
    }
    else if(div.is(".blue")) {
        color = "#0000FF";
    }
    else if(div.is(".cyan")) {
        color = "#00FFFF";
    }
    else if(div.is(".yellow")) {
        color = "#FFFF00";
    }
    else if(div.is(".orange")) {
        color = "#FF8000";
    }
    else if(div.is(".purple")) {
        color = "#FF00FF";
    }
    else if(div.css("color") != undefined) {
        color = div.css("color");
    }

    return color;
}

/* © 2009 ROBO Design
 * http://www.robodesign.ro
 */

// Keep everything in anonymous function, called on window load.
function createDrawingCanvas(element, color) {

  initTouchToMouse(element.closest('.drawing_canvas_container'));

  var canvas, context, canvasoList, contextoList;
  var root = element.closest('.drawing_canvas_container');

  var strokeColor = color;

  // The active tool instance.
  var tool;
  var tool_default = 'pencil';

  function initCanvas() {

    canvasoList = [];
    contextoList = [];

    // Find the canvas element.
    canvasoList[0] = element[0];
    if (!canvasoList[0]) {
      //alert('Error: I cannot find the canvas element!');
      return;
    }

    if (!canvasoList[0].getContext) {
      //alert('Error: no canvas.getContext!');
      return;
    }

    // Get the 2D canvas context.
    contextoList[0] = canvasoList[0].getContext('2d');
    if (!contextoList[0]) {
      //alert('Error: failed to getContext!');
      return;
    }

    // Add the temporary canvas.
    var container = canvasoList[0].parentNode;
    canvas = document.createElement('canvas');
    if (!canvas) {
      //alert('Error: I cannot create a new canvas element!');
      return;
    }

    canvas.id     = 'imageTemp';
    canvas.width  = canvasoList[0].width;
    canvas.height = canvasoList[0].height;
    container.appendChild(canvas);

    context = canvas.getContext('2d');


    // Activate the default tool.
    if (tools[tool_default]) {
      tool = new tools[tool_default]();
    }

    // Attach the mousedown, mousemove and mouseup event listeners.
    canvas.addEventListener('mousedown', ev_canvas, false);
    canvas.addEventListener('mousemove', ev_canvas, false);
    canvas.addEventListener('mouseup',   ev_canvas, false);
  }

  // The general-purpose event handler. This function just determines the mouse
  // position relative to the canvas element.
  function ev_canvas (ev) {
    if(!root.is('.blocked')) {
      if (ev.layerX || ev.layerX == 0) { // Firefox
        ev._x = ev.layerX;
        ev._y = ev.layerY;
      } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        ev._x = ev.offsetX;
        ev._y = ev.offsetY;
      }

      // Call the event handler of the tool.
      var func = tool[ev.type];
      if (func) {
        func(ev);
      }
    }
  }


  // This function draws the #imageTemp canvas on top of #imageView, after which
  // #imageTemp is cleared. This function is called each time when the user
  // completes a drawing operation.
  function img_update () {
    if(!root.is('no_steps')) {
        new_canvas();
    }
    contextoList[getCanvasIndex(root)].drawImage(canvas, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function new_canvas() {
      // clear all others after this
      var canvasList = root.find('canvas').not('#imageTemp');
      for(var i = getCanvasIndex(root)+1; i<canvasList.length; i++) {
          $(canvasList.get(i)).remove();
      }

      // create new canvas
      var canvas_new, context_new;
      canvas_new = document.createElement('canvas');
      canvas_new.className = "drawing_canvas";
      canvas_new.width  = canvasoList[0].width;
      canvas_new.height = canvasoList[0].height;

      context_new = canvas_new.getContext('2d');

      // copy active image to new
      context_new.drawImage(canvasoList[getCanvasIndex(root)], 0, 0);

      // add to lists
      setCanvasIndex(root, getCanvasIndex(root)+1);
      canvasoList[getCanvasIndex(root)] = canvas_new;
      contextoList[getCanvasIndex(root)] = context_new;

      var container = canvasoList[0].parentNode;
      container.insertBefore(canvas_new, canvas);

      // show
      show_active_canvas();
  }

  function show_active_canvas() {
      for(var i=0; i<canvasoList.length; i++) {
          if(i == getCanvasIndex(root)) {
              $(canvasoList[i]).addClass("act");
          }
          else {
              $(canvasoList[i]).removeClass("act");
          }
      }
  }

  // This object holds the implementation of each drawing tool.
  var tools = {};

  // The drawing pencil.
  tools.pencil = function () {
    var tool = this;
    this.started = false;

    // This is called when you start holding down the mouse button.
    // This starts the pencil drawing.
    this.mousedown = function (ev) {
        if(ev.which == 1) {
            context.beginPath();
            context.moveTo(ev._x, ev._y);
            tool.started = true;
        }
    };

    // This function is called every time you move the mouse. Obviously, it only
    // draws if the tool.started state is set to true (when you are holding down
    // the mouse button).
    this.mousemove = function (ev) {
      if (tool.started) {
        context.lineTo(ev._x, ev._y);
        context.strokeStyle = strokeColor;
        context.stroke();
      }
    };

    // This is called when you release the mouse button.
    this.mouseup = function (ev) {
      if (tool.started) {
        tool.mousemove(ev);
        tool.started = false;
        img_update();
      }
    };
  };

  // The rectangle tool.
  tools.rect = function () {
    var tool = this;
    this.started = false;

    this.mousedown = function (ev) {
      if(ev.which == 1) {
          tool.started = true;
          tool.x0 = ev._x;
          tool.y0 = ev._y;
      }
    };

    this.mousemove = function (ev) {
      if (!tool.started) {
        return;
      }

      var x = Math.min(ev._x,  tool.x0),
          y = Math.min(ev._y,  tool.y0),
          w = Math.abs(ev._x - tool.x0),
          h = Math.abs(ev._y - tool.y0);

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (!w || !h) {
        return;
      }

      context.strokeRect(x, y, w, h);
    };

    this.mouseup = function (ev) {
      if (tool.started) {
        tool.mousemove(ev);
        tool.started = false;
        img_update();
      }
    };
  };

  // The line tool.
  tools.line = function () {
    var tool = this;
    this.started = false;

    this.mousedown = function (ev) {
      if(ev.which == 1) {
          tool.started = true;
          tool.x0 = ev._x;
          tool.y0 = ev._y;
      }
    };

    this.mousemove = function (ev) {
      if (!tool.started) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.beginPath();
      context.moveTo(tool.x0, tool.y0);
      context.lineTo(ev._x,   ev._y);
      context.stroke();
      context.closePath();
    };

    this.mouseup = function (ev) {
      if (tool.started) {
        tool.mousemove(ev);
        tool.started = false;
        img_update();
      }
    };
  };

  initCanvas();

  return this;
}

/**
* Konvertiert Touch events in mouse events für DrawingCanvas auf Touchgeräten.
*/
function touchHandler(event)
{
    event = event.originalEvent;
    var touches = event.changedTouches,
        first = touches[0],
        type = "";
    switch(event.type)
    {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;
        case "touchend":   type = "mouseup";   break;
        default:           return;
    }

    // initMouseEvent(type, canBubble, cancelable, view, clickCount,
    //                screenX, screenY, clientX, clientY, ctrlKey,
    //                altKey, shiftKey, metaKey, button, relatedTarget);

    var simulatedEvent = document.createEvent("MouseEvent");

    simulatedEvent.initMouseEvent(type, true, true, window, 1,
                                  first.screenX, first.screenY,
                                  first.clientX, first.clientY, false,
                                  false, false, false, 0/*left*/, null);

    first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
    event.stopPropagation();
}

/**
* Initialisiert das Touch->Mouse für ein Element.
*/
function initTouchToMouse(element)
{
    element.on("touchstart", touchHandler);
    element.on("touchmove", touchHandler);
    element.on("touchend", touchHandler);
    element.on("touchcancel", touchHandler);
}


/** *********************************************************************
*                                                                       *
*  MD5 Part                                                             *
*                                                                       *
* ******************************************************************** */

function encryptMD5(str) {
  //  discuss at: http://phpjs.org/functions/md5/
  // original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // improved by: Michael White (http://getsprink.com)
  // improved by: Jack
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //    input by: Brett Zamir (http://brett-zamir.me)
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //  depends on: utf8_encode
  //   example 1: md5('Kevin van Zonneveld');
  //   returns 1: '6e658d4bfcb59cc13f96c14450ac40b9'

  var xl;

  var rotateLeft = function (lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  };

  var addUnsigned = function (lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  };

  var _F = function (x, y, z) {
    return (x & y) | ((~x) & z);
  };
  var _G = function (x, y, z) {
    return (x & z) | (y & (~z));
  };
  var _H = function (x, y, z) {
    return (x ^ y ^ z);
  };
  var _I = function (x, y, z) {
    return (y ^ (x | (~z)));
  };

  var _FF = function (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(_F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  var _GG = function (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(_G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  var _HH = function (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(_H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  var _II = function (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(_I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  var convertToWordArray = function (str) {
    var lWordCount;
    var lMessageLength = str.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = new Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  };

  var wordToHex = function (lValue) {
    var wordToHexValue = '',
      wordToHexValue_temp = '',
      lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }
    return wordToHexValue;
  };

  var x = [],
    k, AA, BB, CC, DD, a, b, c, d, S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22,
    S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20,
    S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23,
    S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;


  str = utf8_encode(str);
  x = convertToWordArray(str);
  a = 0x67452301;
  b = 0xEFCDAB89;
  c = 0x98BADCFE;
  d = 0x10325476;

  xl = x.length;
  for (k = 0; k < xl; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = _FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = _FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = _FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = _FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = _FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = _FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = _FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = _FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = _FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = _FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = _FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = _FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = _FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = _FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = _FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = _FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = _GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = _GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = _GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = _GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = _GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = _GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = _GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = _GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = _GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = _GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = _GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = _GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = _GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = _GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = _GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = _GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = _HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = _HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = _HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = _HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = _HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = _HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = _HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = _HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = _HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = _HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = _HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = _HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = _HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = _HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = _HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = _HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = _II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = _II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = _II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = _II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = _II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = _II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = _II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = _II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = _II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = _II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = _II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = _II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = _II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = _II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = _II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = _II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

  return temp.toLowerCase();
}

function utf8_encode(argString) {
  //  discuss at: http://phpjs.org/functions/utf8_encode/
  // original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: sowberry
  // improved by: Jack
  // improved by: Yves Sucaet
  // improved by: kirilloid
  // bugfixed by: Onno Marsman
  // bugfixed by: Onno Marsman
  // bugfixed by: Ulrich
  // bugfixed by: Rafal Kukawski
  // bugfixed by: kirilloid
  //   example 1: utf8_encode('Kevin van Zonneveld');
  //   returns 1: 'Kevin van Zonneveld'

  if (argString === null || typeof argString === 'undefined') {
    return '';
  }

  var string = (argString + ''); // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var utftext = '',
    start, end, stringl = 0;

  start = end = 0;
  stringl = string.length;
  for (var n = 0; n < stringl; n++) {
    var c1 = string.charCodeAt(n);
    var enc = null;

    if (c1 < 128) {
      end++;
    } else if (c1 > 127 && c1 < 2048) {
      enc = String.fromCharCode(
        (c1 >> 6) | 192, (c1 & 63) | 128
      );
    } else if ((c1 & 0xF800) != 0xD800) {
      enc = String.fromCharCode(
        (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
      );
    } else { // surrogate pairs
      if ((c1 & 0xFC00) != 0xD800) {
        throw new RangeError('Unmatched trail surrogate at ' + n);
      }
      var c2 = string.charCodeAt(++n);
      if ((c2 & 0xFC00) != 0xDC00) {
        throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
      }
      c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
      enc = String.fromCharCode(
        (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
      );
    }
    if (enc !== null) {
      if (end > start) {
        utftext += string.slice(start, end);
      }
      utftext += enc;
      start = end = n + 1;
    }
  }

  if (end > start) {
    utftext += string.slice(start, stringl);
  }

  return utftext;
}

}())
