/*
* v1.0.1 18/04/16 JavaScript eLearn.js - by Arne Westphal
* eLearning Buero MIN-Fakultaet - Universitaet Hamburg
* touch-script base by PADILICIOUS.COM and MACOSXAUTOMATION.COM
* uses ResizeSensor by Marc J. Schmidt. https://github.com/marcj/css-element-queries/
*/

var VERSION_NR = "1.0.1";
var VERSION_DATE = "04/2018";

var actions = {
    CONTENT_RESIZE : "ContentResize",
}

// Will be set on first Touch event. See Help Functions at bottom
var touchSupported = false;

var visSection = 0;
var allShown = false;
var overviewShown = false;
var navigationTitle = "";

var backbuttonEnabled = false;
var backpage = 0;
var backpagetype = "index";

// used to block "showNext()". Optional for quiz based on eLearn.js
var blockProgressQuizJS = false;
var blockProgressAlertActivated = false;
var blockProgressAlertText = "";
var blockProgressShowElementActivated = false;
var blockProgressShowElementText = "";

// For general activation or deactivation of functions (set by functions)
var secSwipeEnabled = true;
var dirButtonsEnabled = true;
var keyNavigationEnabled = true;
var progressbarEnabled = true;

// For more intuitive usage of functions. (e.g. eLearnJS.showNext())
var eLearnJS = this;

/**
* Going back in History without reloading the page.
*/
window.onpopstate = function(e){
    e.stopPropagation();
    e.preventDefault();
    if(e.state == undefined || e.state.p == null || e.state.p == undefined) {
        setTimeout(function() {showSection(parseInt(0));}, 100);
    }
    else {
        setTimeout(function() {showSection(parseInt(e.state.p));}, 100);
    }
};

// --------------------------------------------------------------------------------------
// Initialisierungsfunktion
// --------------------------------------------------------------------------------------

$(document).ready(function() {
    initiateELearnJS();
    initiateTouchDetection();
    initiateInfo();
    initiateSections();
    initiateGalleries();
    initiateSideMenu();
    initiateTooltips();
    initiateHideables();
    initiateTabbedBoxes();
    initiateHoverInfos();
    initiateScrollBarListener();
    updateNavBarWidth();

    // add listeners
    document.addEventListener("ejssectionchange", resizeAllSliders);
    document.addEventListener("ejspageinteraction", pushHistoryState);

    new ResizeSensor(document.body, function(dimensions) {
        updateWrapSize();
    });

    // checks parameters for navigation to specific page
    checkParameters();

    // used for size checks. Used for iFrame messaging on size change
    updateWrapSize();

    // init QR Code for sharing
    $('#qrcode').qrcode({
        "width": 256,
        "height": 256,
        "text": window.location.href
    });
    $('#qr_overlay').click(function() {$('#qr_overlay').hide();});
});

/**
* Fügt alle notwendigen Elemente in den Quelltext ein.
*/
function initiateELearnJS() {
    $($('#wrap')[0]).prepend(
            "<div class='skip-arrows noselect'>" // <!-- Arrow Left and Right -->
                + "<div onclick='javascript: showPrev();' id='btnPrev' class='icon-back btn'></div>"
                + "<div onclick='javascript: showNext();' id='btnNext' class='icon-next btn'></div>"
            + "</div>"
            + "<div class='section-overview noselect'></div>" // <!-- Container for Overview -->
            + "<div id='navigation' class='noselect'>"
                // <!-- Grey Top Menu-bar - Reihenfolge wichtig -->
                + "<div id='nav-bar'>"
                    + "<div onclick='javascript: backButtonPressed();' id='btnBackCon' class ='btn' title='Zurück zur Übersicht'><div class='icon-font' id='btnBack'>b</div><div id='btnBackText'>Zurück</div></div>"
                    + "<div onclick='javascript: toggleAllSections();' id='btnAllCon' class ='btn' title='Zeige/verstecke Bereiche'><div class='icon-font' id='btnAll'>s</div><div id='btnAllText'>Ansicht</div></div>"
                    + "<div onclick='javascript: showSectionOverview();' id='btnExp' class ='btn' title='Inhaltsverzeichnis'><div class='icon-font' id='btnExpSym'>c</div><div id='nav-title'>Name des Moduls</div></div>"
                    + "<div onclick='javascript: toggleSideMenu(isSideMenuVisible());' id='btnMenu' class ='icon-font btn' title='Menü'>m</div>"
                    + "<div onclick='javascript: startHelp();' id='btnHelp' class ='btn' title='Zeige/verstecke Bereiche'><div class='icon-font' id='btnHelpSym'>q</div><div id='btnHelpText'>Hilfe</div></div>"
                    + "<div style='clear:both'></div>"
                + "</div>"
                // <!-- Touch Gesture Elements -->
                + "<div class='touchScroll' id='rightTouch'><div><p>n</p></div></div>"
                + "<div class='touchScroll' id='leftTouch'><div><p>b</p></div></div>"
                // <!-- Progress bar -->
                + "<div id='progressback'><div id='progressbar'></div></div>"
                // <!-- SIDE MENU -->
                + "<div class='menu-wrap'></div>"
            + "</div>"
            + "<div id='qr_overlay'><div id='qrcode'></div></div>");

    // Anhand der Scrollposition merken welche Section aktiv war.
    $(document).scroll(function() {
        if(allShown) {
            var scrollTop = $(document).scrollTop();
            var i = visSection;
            var sHeight = $($('section')[i]).position().top - $('#navigation').height() - 15;
            while(sHeight < scrollTop) {
                i++;
                if(i == $('section').length) {
                    i -= 1;
                    break;
                }
                sHeight = $($('section')[i]).position().top - $('#navigation').height() - 15;
            }
            while(sHeight > scrollTop) {
                i--;
                if(i < 0) {
                    i = 0;
                    break;
                }
                sHeight = $($('section')[i]).position().top - $('#navigation').height() - 15;
            }
            visSection = i;
            updateContentOverview();
        }
    });
}

/**
* Erstellt die einfachen Buttons, die das Vor- und Zurückgehen sowie das Anzeigen
* aller Sections ermöglichen
*/
function initiateSections() {
    $('#progressbar').css('width', 100/$('section').length + "%");
    navigationTitle = $('#nav-title').text();
    addTouchToSections();
    createContentOverview();
    createSectionOverview();
    $('.section-overview').css('top', $('nav-bar').outerHeight() + "px");
    $('.section-overview').css('height', "calc(100% - " + $('.section-overview').css("top") + ")");
    //$('#sideMenu').css('max-width', Math.min($('#sideMenu').width(), $(document).width()) + "px");
    setDirectionButtonsEnabled(true);
    setProgressbarEnabled(true);
    showSection(0);
};

/**
* Erstellt das SideMenu
*/
function initiateSideMenu() {
    var downloadUrl = "./download.zip";
    var downloadPDF = "./page.pdf";
    var downloadEPUB = "./page.epub";
    $('.menu-wrap').html('<div class="side-menu" id="sideMenu">'
                        + '<div><table>'
                            + '<tr class="side-menu-element" onclick="javascript: window.print();">'
                                + '<td class="side-menu-icon"><div class="icon-print"></div></td> '
                                + '<td class="side-menu-content"><div>Drucken</div></td>'
                            + '</tr>'
                            + '<tr class="side-menu-element" onclick="javascript: $(\'#qr_overlay\').show();">'
                                + '<td class="side-menu-icon"><div class="icon-share"></div></td> '
                                + '<td class="side-menu-content">Teilen</td>'
                            + '</tr>'
                            + '<tr class="side-menu-element" onclick="javascript: openInfo();">'
                                + '<td class="side-menu-icon"><div class="icon-info"></div></td> '
                                + '<td class="side-menu-content">Impressum</td>'
                            + '</tr>'
                            + '<tr class="side-menu-element" id="menu-item-download" onclick="javascript: startDownload(\''+downloadUrl+'\');">'
                                + '<td class="side-menu-icon"><div class="icon-zip"></div></td> '
                                + '<td class="side-menu-content">Quelldateien herunterladen</td>'
                            + '</tr>'
                            + '<tr class="side-menu-element" id="menu-item-download-pdf" onclick="javascript: startDownload(\''+downloadPDF+'\');">'
                                + '<td class="side-menu-icon"><div class="icon-pdf"></div></td> '
                                + '<td class="side-menu-content">PDF herunterladen</td>'
                            + '</tr>'
                            + '<tr class="side-menu-element" id="menu-item-download-epub" onclick="javascript: startDownload(\''+downloadEPUB+'\');">'
                                + '<td class="side-menu-icon"><div class="icon-epub"></div></td> '
                                + '<td class="side-menu-content">EPUB herunterladen</td>'
                            + '</tr>'
                        + '</table></div>'
                        + '</div>');
    doesURLExist(downloadUrl, function(exists) {
        if(!exists) {
            $('#menu-item-download').hide();
        }
    });
    doesURLExist(downloadPDF, function(exists) {
        if(!exists) {
            $('#menu-item-download-pdf').hide();
        }
    });
    doesURLExist(downloadEPUB, function(exists) {
        if(!exists) {
            $('#menu-item-download-epub').hide();
        }
    });
    $('#sideMenu').css('right', "-"+($('#sideMenu').width()+10)+"px");
}

/**
* Passt die Navigationsleiste an die Breite des window an
*/
function updateNavBarWidth() {
    var headerSpace = 15.0; // standard wert
    $('#nav-bar').children(':visible').not('#btnExp').each(function(i,e){
        if($(this).attr("id") != undefined)
            headerSpace += $(this).outerWidth(true);
    });
    $('#btnExp').css("width", "calc(100% - " + (headerSpace+5) + "px)");
}


/**
* In der URL können Parameter angegeben werden, um das direkte Anzeigen einer
* Section zu ermöglichen.
*
* mit ?p=2 könnte man z.B. die 3. (0, 1, 2, ...) section öffnen
* mit ?s=Inhaltsverzeichnis würde man die <section name="Inhaltsverzeichnis">
* öffnen.
*/
function checkParameters() {
    if(QueryString.s != undefined) {
        var sectionName = decodeURI(QueryString.s);
        showSection(sectionName);
    }
    else if(QueryString.p != undefined) {
        var idx = parseInt(QueryString.p);
        showSection(idx);
    }
}

// ----------------------------------------------------------------------------
// ------------------------- BACK BUTTON --------------------------------------
// ----------------------------------------------------------------------------

/**
* Zeigt den "Back-Button" an oder blendet ihn aus.
* Standardmäßig aus
*/
function setBackButtonEnabled(b) {
    backbuttonEnabled = b;
    if(b) {
        $('#navigation').addClass("back-enabled");
    }
    else {
        $('#navigation').removeClass("back-enabled");
    }
    updateNavBarWidth();
}

/**
* Gibt aus ob der backbutton aktiviert ist.
*/
function isBackButtonEnabled() {
    return backbuttonEnabled;
}


/**
* Ändert die Beschriftung des Back-Buttons.
* Standardmäßig "Zurück"
*/
function setBackButtonText(text) {
    $('#btnBackText').text(text);
    updateNavBarWidth();
}


/**
* Zeigt die interpretierte backpage und öffnet sie je nachdem welcher
* backpagetype eingestellt wurde
* Standardmäßig wird die erste <section> angezeigt
*/
function backButtonPressed() {
    if(backpagetype === "name") {
        var idx = $('section').index($('section[name="' + backpage + '"]').get(0));
        overviewShowSection(idx);
    }
    else if(backpagetype === "index") {
        overviewShowSection(backpage);
    }
    else if(backpagetype === "link") {
        window.open(backpage, "_self")
    }
}

/**
* Stellt ein worauf der Back-Button verlinkt. Dabei kann auf verschiedene
* Typen verlinkt werden
* @param val : hier wird der Wert eingetragen, der zusammen mit dem type als
*               Ziel ausgewertet wird.
* @param type : gibt an wie "val" interpretiert wird
            "name" entspricht dem name attribut einer <section>. Dieser name
*               sollte dann bei val als String übergeben werden
*           "index" entspricht dem index einer <section>. Die erste section
*               ist dabei 0 und sie werden aufsteigend nummeriert.
*           "link" entspricht einem HREF Link. Dieses kann relativ auf der
*               Seite verlinken wie zB. "../andereSeite" oder auf eine
*               auf eine ganz andere Seite verlinken wie "http://google.com"
*
* Beispiel: setBackPage("http://google.com", "link"); verlinkt auf Google.
* Standardmäßig wird die erste <section> angezeigt
*/
function setBackPage(val, type) {
    backpagetype = type;
    backpage = val;
}


// ----------------------------------------------------------------------------
// ------------------------- GENERAL ------------------------------------------
// ----------------------------------------------------------------------------

/**
* Zeigt die vorherige Section
* Funktioniert nur, wenn nicht alle Sections angezeigt werden.
* @event: Fires "ejspageinteraction" event on document when done successfully.
*/
function showPrev() {
    var ret = showSection(visSection-1);
    // Ausführen registrierter Funktionen
    if(ret) {
        fireEvent(document, createEvent("ejspageinteraction", {}));
    }
};

/**
* Zeigt die nächste Section
* Funktioniert nur, wenn nicht alle Sections angezeigt werden.
* @event: Fires "ejspageinteraction" event on document when done successfully.
*/
function showNext() {

    // nur wenn entweder nicht blockiert bei unbeantworteter Frage
    // oder alle (sichtbaren) Fragen beantwortet
    if(!checkBlockProgress()) {
        var ret = showSection(visSection+1);
        // Ausführen registrierter Funktionen
        if(ret) {
            fireEvent(document, createEvent("ejspageinteraction", {}));
        }
    }
};

/**
* Zeigt eine bestimmte section an.
* Wird von der section overview ausgeführt. (Ausklappbares Inhaltsverzeichnis)
* @event: Fires "ejspageinteraction" event on document when done successfully.
*/
function overviewShowSection(i) {
    var ret = showSection(i);

    // Ausführen registrierter Funktionen
    if(ret) {
        fireEvent(document, createEvent("ejspageinteraction", {}));
    }
}

/**
* Zeigt eine bestimmte Section (nach Index)
* Funktioniert nur, wenn nicht alle Sections angezeigt werden.
* @event: Fires "ejssectionchange" + "ejssectionchangelate" event on
*   document when done successfully.
*/
function showSection(i) {
    overviewShown = true;
    showSectionOverview();

    var sectionBefore = visSection;

    // get section to name
    if(typeof i === 'string' || i instanceof String) {
        i = $('section').index($('section[name="' + i + '"]').get(0));
    }

    // show only this section
    if(!allShown && i >= 0 && i < $('section').length) {
        $('section').hide();

        $($('section')[i]).show();

        var topPos = $($('section')[i]).position().top - $('#navigation').height() - 10;
        if($(document).scrollTop() > topPos) {
            $(document).scrollTop(topPos);
        }

        $('#nav-title').text($($('section')[i]).attr('name'));
        allShown = false;
        calcProgress(i);
    }
    // scroll to that section
    else if(allShown) {
        var topPos = $($('section')[i]).position().top - $('#navigation').height();
        $(document).scrollTop(topPos);
    }
    else {
        return false;
    }

    // section was updated
    if(i >= 0 && i < $('section').length) {
        visSection = i;
        updateContentOverview();
        stopVideos();
    }

    if(!allShown) {
        setDirectionButtonsEnabledIdx(visSection);
    }

    var sectionChange = {
        "section": visSection,
        "sectionbefore" : sectionBefore,
        "changed" : visSection !== sectionBefore,
        "allShownChange" : false};
    fireEvent(document, createEvent("ejssectionchange", sectionChange));
    fireEvent(document, createEvent("ejssectionchangelate", sectionChange));

    return true;
};

/**
* Registriert eine Funktion, die ausgeführt wird, nachdem eine neue Section
* angezeigt wurde.
*
* @deprecated Since version 1.0.0. Simply add the event listener yourself.
*   this makes better event handling possible.
*/
function registerAfterShow(key, fnc, late) {
    if(late) {
        document.addEventListener("ejssectionchangelate", fnc);
    }
    else {
        document.addEventListener("ejssectionchange", fnc);
    }
}

/**
* Registriert eine Funktion, die ausgeführt wird, nachdem ein sectionwechsel
* durchgeführt wurde. Im gegensatz zu "afterShow" nur, wenn die section
* tatsächlich verändert wurde.
*
* @deprecated Since version 1.0.0. Simply add the event listener yourself.
*   this makes better event handling possible.
*/
function registerAfterPageInteraction(key, fnc) {
    document.addEventListener("ejspageinteraction", fnc);
}

/**
* Registriert eine Funktion, die ausgeführt wird, nachdem ein neuer Tab
* in einer tabbed-box angezeigt wurde.
*
* @deprecated Since version 1.0.0. Simply add the event listener yourself.
*   this makes better event handling possible.
*/
function registerAfterTabChange(key, fnc) {
    document.addEventListener("ejstabchange", fnc);
}

/**
* Registriert eine Funktion, die ausgeführt wird, wenn die Fenstergröße
* sich verändert hat. Alle hier registrierten Funktionen werden nicht direkt,
* sondern mit einer kurzen Verzörung ausgeführt, damit sie bei einer
* kontinuierlichen Veränderung nicht ständig sondern nur einmal ausgeführt
* werden.
*
* @deprecated Since version 1.0.0. Simply add the event listener yourself.
*   this makes better event handling possible.
*/
function registerAfterWindowResize(key, fnc, late) {
    if(late) {
        window.addEventListener("ejswindowresizelate", fnc);
    }
    else {
        window.addEventListener("ejswindowresize", fnc);
    }
}

/**
* Registriert eine Funktion, die ausgeführt wird, nachdem alle Slider
* an die Fenstergröße angepasst wurden.
*
* @deprecated Since version 1.0.0. Simply add the event listener yourself.
*   this makes better event handling possible.
*/
function registerAfterSliderResize(key, fnc) {
    document.addEventListener("ejssliderresize", fnc);
}

/**
* Fügt einen Zustand in die Browser-Historie ein. Hierbei werden benötigte
* Parameter automatisch gesetzt.
*/
function pushHistoryState() {
    if(!allShown) {
        try {
            if(window.history.state == undefined
                || (window.history.state.p != undefined
                    && window.history.state.p != null
                    && window.history.state.p != visSection)) {
                window.history.pushState({p: visSection}, "State", "?p="+visSection);
            }
        } catch (e) {

            //window.location = "?p="+visSection;
        }
    }
}

/**
* Aktualisiert den Fortschritt der progressbar
*/
function calcProgress(i) {
    var p = ((i)*100)/($('section').length);
    $('#progressbar').css('left', p + "%");
};

/**
* Schaltet zwischen alle Sections anzeigen und nur eine um.
* @event: Fires "ejssectionchange" + "ejssectionchangelate" event on
*   document when done successfully.
*/
function toggleAllSections() {
    setDirectionButtonsEnabled(allShown);
    setProgressbarEnabled(allShown);
    $('#nav-title').text(navigationTitle);

    if(allShown) {
        allShown = false;
        showSection(visSection);
    }
    else {
        $('section').show();
        $(document).scrollTop($($('section')[visSection]).position().top - $('#navigation').height() - 10);
        allShown = true;
        resizeAllSliders();

        var sectionChange = {
            "section": visSection,
            "sectionbefore" : visSection,
            "changed" : false,
            "allShownChange" : true};
        fireEvent(document, createEvent("ejssectionchange", sectionChange));
        fireEvent(document, createEvent("ejssectionchangelate", sectionChange));
    }
};

/**
* Aktiviert oder deaktiviert generell Richtungsknöpfe.
* Zum manuellen aktivieren oder deaktivieren durch den Ersteller der Seite
*/
function generalDirectionButtonsEnabled(b) {
    if(b) {
        setDirectionButtonsEnabledIdx(visSection);
    }
    else {
        setDirectionButtonsEnabled(false);
    }
    dirButtonsEnabled = b;
}

/**
* Aktiviert die Frage vor und zurück Buttons wenn b == true. deaktiviert sie sonst.
*/
function setDirectionButtonsEnabled(b) {
    if(dirButtonsEnabled) {
        if(b) {
            $('#btnPrev').show();
            $('#btnNext').show();
        }
        else {
            $('#btnPrev').hide();
            $('#btnNext').hide();
        }
    }
};

/**
* Aktiviert die Frage vor und zurück Buttons je nach Index.
*/
function setDirectionButtonsEnabledIdx(i) {
    if(dirButtonsEnabled) {
        $('#btnPrev').show();
        $('#btnNext').show();
        if(i == 0 || overviewShown) {
            $('#btnPrev').hide();
        }
        if(i == ($('section').length - 1) || overviewShown) {
            $('#btnNext').hide();
        }
    }
}


/**
* Generelles aktivieren/deaktivieren der Fortschrittsleiste
*/
function generalProgressbarEnabled(b) {
    setProgressbarEnabled(b);
    progressbarEnabled = b;
}

/**
* Aktiviert die Progressbar wenn b == true. deaktiviert sie sonst.
*/
function setProgressbarEnabled(b) {
    if(progressbarEnabled) {
        if(b) {
            $('#progressback').show();
            $('.menu-wrap').css('top', $('#navigation').height() + "px");
            $('.section-overview').css('top', $('#nav-bar').outerHeight() + "px");
            $('.section-overview').css('height', "calc(100% - " + $('.section-overview').css("top") + ")");
        }
        else {
            $('#progressback').hide();
            $('.menu-wrap').css('top', $('#navigation').height() + "px");
            $('.section-overview').css('top', $('#nav-bar').outerHeight() + "px");
            $('.section-overview').css('height', "calc(100% - " + $('.section-overview').css("top") + ")");
        }
    }
};


/**
* Aktiviert oder deaktiviert das Blocken des Weitergehens (in showNext())
*/
function setBlockProgressIfQuestionsNotAnswered(b) {
    blockProgressQuizJS = b;
}

/**
* Gibt zurück ob der Fortschritt geblockt werden soll.
* Zeigt außerdem Blocknachrichten an.
*/
function checkBlockProgress() {
    var block = blockProgressQuizJS && !getVisibleQuestionsAnswered();

    if(block) {
        // Zeigt alert
        if(blockProgressAlertActivated) {
            alert(blockProgressAlertText);
        }

        // zeigt gesetztes Element an
        if(blockProgressShowElementActivated) {
            $(blockProgressShowElementText).show();
        }
    }
    else {
        // blendet gesetztes Element wieder aus
        if(blockProgressShowElementActivated) {
            $(blockProgressShowElementText).hide();
        }
    }

    return block;
}

/**
* Aktiviert oder deaktiviert einen Alert im Blockfall und setzt ggf. die
* Nachricht die angezeigt wird.
*/
function setBlockProgressAlert(enabled, text) {
    blockProgressAlertActivated = enabled;
    blockProgressAlertText = text;
}

/**
* Aktiviert oder deaktiviert ein Element mit dem @param text als selector.
* Beispiel: setBlockProgressShowElement(true, "#blocktext") aktiviert das
* einblenden des Elements mit der ID="blocktext", wenn der Fortschritt blockiert
* wurde.
*/
function setBlockProgressShowElement(enabled, text) {
    blockProgressShowElementActivated = enabled;
    blockProgressShowElementText = text;
}


// -------------------------------------------------------------------------------------
// Navigation Title
// -------------------------------------------------------------------------------------

function setNavigationTitle(text) {
    $('#nav-title').text(text);
    // default navigation title (when no single section is open)
    navigationTitle = text;
}


// -------------------------------------------------------------------------------------
// Overview
// -------------------------------------------------------------------------------------

// beinhaltet eine Liste alle bereits betrachteten Sections.
var sectionsVisited = [];

/**
* Erstellt ein Inhaltsverzeichnis. Wird #content-overview hinzugefügt.
*/
function createContentOverview() {
    if($('#content-overview').length > 0) {
        var text = "<ul>";
        var level = 0;
        var levels = {
            SUB : 1,
            SUBSUB : 2
        };

        for(var i=0; i<$('section').length; i++) {

            var sec = $($('section')[i]);

            if(sec.is('.hide-in-overview')) continue;

            var sec_level = 0;
            if(sec.is('.sub')) sec_level = levels.SUB;
            if(sec.is('.subsub')) sec_level = levels.SUBSUB;

            if($('#content-overview').is('.kachel')) {
                // es kann nur eine ebenen zur zeit geöffnet werden
                // aufgrund der Schachtelung in li's einzige logische Variante
                if(level < sec_level) {
                    // ende des li zum schachteln entfernen
                    text = text.substring(0, text.length - 5);
                    text += "<ul>\r\n";
                    level++;
                }
                // mehrere ebenen können gleichzeitig beendet werden
                while(level > sec_level) {
                    text += "</ul></li>\r\n";
                    level--;
                }
            }
            // listenansicht
            else {
                // higher level
                while(level < sec_level) {
                    text += "<ul>";
                    level++;
                }
                // lower level
                while(level > sec_level) {
                    text += "</ul>";
                    level--;
                }
            }

            text += "<li onclick='overviewShowSection("+i+"); event.stopPropagation();'>";

            text += "<div class='sectionRead'><div class='img'></div></div>";
            text += "<span class='title'>" + sec.attr('name') + "</span>";
            if(sec.attr('desc') != undefined
                && sec.attr('desc').length > 0) {
                text += "<p>" + sec.attr('desc') + "</p>";
            }

            text += "</li>";

            sectionsVisited.push(false);
        }
        // close all open ul's
        while(level >= 0) {
            text+="</ul>";
            level--;
        }

        $('#content-overview').html(text);
        $('#content-overview').find('li').each(function(i,e) {
            if($(this).children('ul').length != 0) {
                $(this).addClass("wide");
            }
        });
        $('#content-overview').find("a").click(function(e) {
            e.preventDefault();
        });
    }
}

/**
* Aktualisiert die "gelesen" Anzeige in dem Inhaltsverzeichnis,
* welches in #content-overview erstellt wurde.
*/
function updateContentOverview() {
    sectionsVisited[visSection] = true;
    var li_idx = 0;
    for(var i=0; i<$('section').length; i++) {

        if($('section').eq(i).is('.hide-in-overview')) {
            continue;
        }

        if(sectionsVisited[i] && !$('#content-overview').is('.hide-read')) {
            $($('#content-overview').find('li').get(li_idx)).children('.sectionRead').first().addClass('read');
        }
        else {
            $($('#content-overview').find('li').get(li_idx)).children('.sectionRead').first().removeClass('read');
        }

        li_idx++;
    }
}

/**
* Erstellt ein Inhaltsverzeichnis. (Für die Nav-Leiste)
*/
function createSectionOverview() {
    var text = "<div>";

    for(var i=0; i<$('section').length; i++) {
        var sec = $($('section')[i]);
        var cls = "";
        if(sec.is('.sub')) cls=" sub";
        if(sec.is('.subsub')) cls=" subsub";

        text += "<label><div class='section-overview-element btn"+cls+"' onclick='overviewShowSection("+i+");'>"
                    + sec.attr('name')
                +"</div></label>";
    }
    text+="</div>";

    $('.section-overview').html(text);
}


/**
* Zeigt oder versteckt die Kapitelübersicht aus der Navigationsleiste.
* Wird bei einem klick auf das jeweilige Symbol ausgeführt.
*/
function showSectionOverview() {
    overviewShown = !overviewShown;
    if(!overviewShown) {
        $('.section-overview').hide();
        $('#btnExpSym').removeClass("mirrorY");
        if(!allShown) {
            setDirectionButtonsEnabledIdx(visSection);
        }
        else {
            setDirectionButtonsEnabled(false);
        }
    }
    else {
        $('.section-overview').show();
        $('.section-overview').find(".section-overview-element").removeClass("active");
        $($('.section-overview').find(".section-overview-element")[visSection]).addClass("active");
        $('#btnExpSym').addClass("mirrorY");
        setDirectionButtonsEnabled(false);
    }
}

/**
* Bei einem Klick neben die Elemente Kapitelübersicht, Side-Menu, Lightbox (für
* info) werden diese wieder geschlossen.
*/
$(document).on("click", function(e){
    if(!$(e.target).is(".section-overview *")
        && !$(e.target).is("#btnExp")
        && !$(e.target).is("#btnExp *")
        && overviewShown) {
        showSectionOverview();
    }
    if(!$(e.target).is("#sideMenu")
        && !$(e.target).is("#sideMenu *")
        && !$(e.target).is("#btnMenu")
        && isSideMenuVisible()) {
        toggleSideMenu();
    }
    if(!$(e.target).is(".lb-wrap *")
        && !$(e.target).is("#sideMenu *")) {
        $('.lb-wrap').hide();
    }
});


// --------------------------------------------------------------------------------------
// Side Menu
// --------------------------------------------------------------------------------------

/**
* Öffnet und Schließt das Menü an der rechten Seite
*/
function toggleSideMenu(isVisible) {
    $('.menu-wrap').css('top', $('#navigation').height() + "px");
    if (isSideMenuVisible()) {
        $('#sideMenu').animate({
            right: "-="+($('#sideMenu').width()+10),
            }, 200,
            function() {
                $('#sideMenu').css("right", "-" + ($('#sideMenu').width()+10));
        });
    }
    else {
        $('#sideMenu').animate({
            right: "0",
            }, 200,
            function() {
                $('#sideMenu').css("right", "0");
        });
    }
}

/**
* Gibt zurück ob das Menü sichtbar ist.
* true = sichtbar
*/
function isSideMenuVisible() {
    return ($('#sideMenu').css('right') == (0 + "px"));
}


/**
* Initialisiert den footer des Info Bereichs.
*/
function initiateInfo() {
    $('#info').find('.lightbox').append('<div class="elearn-info">'
        + 'Benutzt das eLearn.js Script Version ' + VERSION_NR + ' | ' + VERSION_DATE + '. '
        + '<br>'
        + '<span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">elearn.js Template</span> '
        + 'von <span xmlns:cc="http://creativecommons.org/ns#" property="cc:attributionName">Universität Hamburg</span> '
        + 'ist lizenziert unter einer <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">'
        + 'Creative Commons Namensnennung</a> - Weitergabe unter gleichen Bedingungen 4.0 International Lizenz'
        + '<br>'
        + '<a href="https://www.min.uni-hamburg.de/de/imprint.html">Impressum</a>'
        + '</div>');
    $('#info').find('.lightbox').append("<div class='support'><small>Dieses "
        + "Vorhaben wird innerhalb "
        + "des gemeinsamen Bund-Länder-Programms für bessere Studienbedingungen "
        + "und mehr Qualität in der Lehre aus Mitteln des Bundesministerium für "
        + "Bildung und Forschung unter dem Förderkennzeichen 01PL12033 "
        + "gefördert. Die Verantwortung für den Inhalt dieser Veröffentlichung "
        + "liegt bei den Autor/-innen.</small>"
        + '<img src="assets/img/logo-bmbf.gif" alt="Logo vom Bundesministerium für Bildung und Forschung">'
        + '<div style="clear: both;">'
        + '<a href="http://www.uni-hamburg.de" target="_blank"><img src="assets/img/logo-uhh.gif" alt="Logo der Universität Hamburg" style="padding:1em 1em 2em 1em;"></a>'
        + "</div>");
}

/**
* Zeigt die Info-Lightbox an, welche die ID "info" hat.
*/
function openInfo() {
    $('#info').show();
    $('#sideMenu').animate({
        right: "-="+($('#sideMenu').width()+10),
        }, 200,
        function() {
    });
}


/**
* Herunterladen der zip Datei download.zip
*/
function startDownload(url) {
    window.open(url,'_blank');
}



// --------------------------------------------------------------------------------------
// Slider Part. Initialization and functions to interact.
// Touch part is integretated in the older touch functions.
// --------------------------------------------------------------------------------------

/**
* Die Index Nummer des Arrays entspricht der Nummer des Sliders (zB Slider 0 =
* der oberste Slider im Quelltext)
* An dem Index steht dann welches Bild aktuell sichtbar ist.
*/
var visibleImage = {};
var lastSliderDimensions = {};
var ulTransitionDuration = "0.5s";


/**
* Initialisiert alle Slider
* Fügt Buttons hinzu. Stellt die Größe richtig ein...
*/
function initiateGalleries() {
    // Container für Zoom-Funktion
    $('body').prepend('<div class="image-zoom-container">'
                        + '<div class="lb-bg" onclick="closeZoom(this);"></div>'
                        + '<div class="img-lightbox">'
                            + '<div class="close btn" onclick="closeZoom($(this).parent());">x</div>'
                        + '</div>'
                    + '</div>');
    $('.slider').wrap("<div class='slider-con'></div>");
    $('.slider').each(function() {
        var ul = $($(this).children('ul.img-gallery')[0]);

        // initiate preview if activated
        if($(this).filter('.preview-nav').length > 0) {
            initiateSliderPreview($(this).parent());
        }

        // initiate gallery buttons
        $(this).after('<div class="slider-back-area btn" onclick="goLeft(this);">'
                        + '<div class="icon-back slider-back btn"></div>'
                    + '</div>'
                    + '<div class="slider-next-area btn" onclick="goRight(this);">'
                        + '<div class="icon-next slider-next btn"></div>'
                    + '</div>'
                    + '<div class="slider-zoom-area btn" onclick="zoomImage(this);">'
                        + '<div class="icon-zoom slider-zoom btn"></div>'
                    + '</div>');
        ul.children('li').prepend("<span class='helper'></span>");
        showSlideButtons(ul, 0, false);

        // add index as loopid for loop
        ul.children('li').each(function(i,e) {
            $(this).attr('loopid', i);
        });

        if(ul.not('.fixed-size').length > 0) {
            getImageSize($(ul.children('li')[0]).children("img"), function(width, height){
                ul.parent().css("height", height + "px");
            });
        }
        $(this).parent().after("<div class='slider-description'></div>");

        if(ul.parent().filter('.loop').length > 0)
            createLoopFor(ul, $('.img-gallery').index(ul), 0);
        var visImage = ul.children('li').index(ul.children('li').not('.loop_clone').first());
        showSlide(ul, visImage, true, false, "0s");
    });
    window.addEventListener("ejswindowresize", resizeAllSliders);
    resizeAllSliders();
}

/**
* Erstellt eine SliderPreview, wenn ein Slider (übergebenes div) die
* Klasse "preview-nav" hat.
*/
function initiateSliderPreview(div) {
    var fullWidth = div.width();
    var liWidth = fullWidth / 4.5;
    var liHeight = fullWidth / 6.0;
    div.after("<div class='slider-nav'></div>");
    var sliderNav = div.next('.slider-nav');
    sliderNav.wrap('<div class="preview-con"></div>');
    sliderNav.html(div.children(".slider").html());
    var ul = sliderNav.children('ul.img-gallery');
    ul.children('li').each(function() {
        var li = $(this);
        li.prepend("<span class='helper'></span>");
        $(this).click(function() {
            var parentUl = $(this).closest('.preview-con').prevAll('.slider-con').find('ul.img-gallery').last();
            var idx = $(this).parent().children('li').index($(this));
            var parentIdx = parentUl.children('li').index(
                parentUl.children('li')
                    .not('.loop_clone').filter('[loopid="' + idx+ '"]'));
            showSlide(parentUl, parentIdx, true, true);
        });
    });
    $(ul.children('li')[0]).addClass("active");
    sliderNav.after('<div class="slider-back-area btn" onclick="goLeft(this);">'
                        + '<div class="icon-back slider-back btn"></div>'
                    + '</div>'
                    + '<div class="slider-next-area btn" onclick="goRight(this);">'
                        + '<div class="icon-next slider-next btn"></div>'
                    + '</div>');

    showSlideButtons(ul, 0, true);
    visibleImage[visibleImage.length] = 0;
}

/**
* Hinterlegt für ein ul (aus einem Slider) die Dimensionen in einem Array.
* Wird genutzt, um zu bestimmen ob eine Neuberechnung nötig ist.
*/
function updateSliderDimensions(ul) {
    var ul_id = $('.img-gallery').index(ul);
    var slider = ul.closest('.slider');
    if(slider.length == 0) slider = ul.closest('.slider-nav');
    if(slider.length == 0) return;
    lastSliderDimensions[ul_id] = {width: slider.width(), height: slider.height()};
}

/**
* Zeigt das Bild weiter links an.
* @param button - der Button der diese Funktion aufruft. (Der Button befindet
* sich in dem Slider)
*/
function goLeft(button) {
    var ul = $(button).prevAll('div').find('.img-gallery').first();
    showSlide(ul, visibleImage[$('.img-gallery').index(ul)]-1, true, true);
}

/**
* Zeigt das Bild weiter rechts an.
* @param button - der Button der diese Funktion aufruft. (Der Button befindet
* sich in dem Slider)
*/
function goRight(button) {
    var ul = $(button).prevAll('div').find('.img-gallery').first();
    showSlide(ul, visibleImage[$('.img-gallery').index(ul)]+1, true, true);
}

// Wird benutzt, um eine Höhenveränderungsanimation zu starten, wenn das neue
// Bild komplett angezeigt wird.
var slideSwitchTimeouts = {};
var loopTimeouts = {};

/**
* Zeigt ein bestimmtes Bild in einem Slider an.
* Händelt Animationen und Dauern und ähnliches.
* @param ul - das <ul> in dem sich das Bild an Stelle "slide" befindet
* @param slide - die Stelle / Nummer des Bildes im <ul> (startet mit 0)
*/
function showSlide(ul, slide, updatePreview, animate, duration) {
    var ul_id = $('.img-gallery').index(ul);

    var slide_intended = (ul.children('li').not('.loop_clone').length + slide) % ul.children('li').not('.loop_clone').length;
    var slideChanged = false;

    // Falls Loop aktiviert springt es mit -1 an die letzte Stelle und mit
    // "x.length" an Stelle 0
    if(ul.parent().filter('.loop').length > 0) {
        if(slide <= 0 || slide >= ul.children('li').length - 1) {
            slide = createLoopFor(ul, ul_id, slide);
        }

        // clear loop timeout
        if(animate) {
            if(duration == undefined) duration = ulTransitionDuration;
            var timeoutDuration = parseFloat(duration.replace(/[^\d\.]/g, "")) * 1000;
            clearTimeout(loopTimeouts[ul_id]);
            loopTimeouts[ul_id] = setTimeout(function() {
                clearLoop(ul);
            }, timeoutDuration);
        }
    }

    // Für alle Slider, falls showSlide möglich
    if((ul.parent().is('.slider') && (slide >= 0 && slide < ul.children('li').length))
       || (ul.parent().is('.slider-nav') && (slide >= 0 && slide*4 < ul.children('li').length))) {
        showSlideLi(ul, ul_id, slide, animate, duration);

    }

    var actual_slide = ul.children('li').eq(visibleImage[ul_id]).attr('loopid');

    // Bildbeschreibung laden, wenn es sich nicht um einen navigations-slider handelt
    if(!ul.parent().is(".slider-nav")) {
        showSlideDescription(ul, slide);
    }

    // Zusätzlich für Slider mit Preview Nav
    if(updatePreview
        && ul.parent().filter('.preview-nav').length > 0) {
        var previeNavLis = ul.parent().parent().nextAll('.preview-con').find('.slider-nav').first().children('ul.img-gallery').children('li');
        previeNavLis.removeClass('active');
        previeNavLis.eq(actual_slide).addClass('active');
        showSlide(previeNavLis.parent(), Math.floor(actual_slide/4), false, animate, duration);
    }

    showSlideButtons(ul, slide, ul.parent().filter('.slider-nav').length > 0);
}

/**
* Fügt für "Loop" benötigte Elemente in den Slider ein, damit eine sprunglose
* Übergänge zwischen den Elementen in eine Richtung möglich sind.
*/
function createLoopFor(ul, ul_id, slide) {
    var active_slide = visibleImage[ul_id];

    // moving right
    if(slide == ul.children('li').length - 1) {
        var slide_next = parseInt(ul.children('li').eq(slide).attr('loopid')) + 1;
        // create loop li
        var originalSlide = ul.children('li').not('.loop_clone').eq(slide_next % ul.children('li').not('.loop_clone').length);
        var newSlide = originalSlide.clone();
        newSlide.addClass('loop_clone');
        ul.children('li').last().after(newSlide);
    }
    // moving left
    else if(slide == 0){
        var slide_next = parseInt(ul.children('li').eq(slide).attr('loopid')) - 1 + ul.children('li').not('.loop_clone').length;
        // create loop li
        var originalSlide = ul.children('li').not('.loop_clone').eq(slide_next % ul.children('li').not('.loop_clone').length);
        var newSlide = originalSlide.clone();
        newSlide.addClass('loop_clone');
        ul.children('li').first().before(newSlide);
        active_slide++;
        slide++;

        var marginLeft = ul.children('li').not('.loop_clone').first().prevAll('.loop_clone').length
                        * ul.children('li').outerWidth(true)
                        * -1;

        ul.css({
            "transition-duration": "0s",
            "margin-left" : marginLeft + "px"
        });
    }

    // expand width
    ul.css({
        "transition-duration": "0s",
        "width": ul.children('li').outerWidth(true) * ul.children('li').length + 10 + "px"
    });
    ul[0].offsetHeight; // apply css changes
    ul.css("transition-duration", ulTransitionDuration);

    return slide;
}

/**
* Entfernt nicht benötigte Elemente aus dem Slider und springt an die korrekte
* Position auf einem Originalelement
*/
function clearLoop(ul) {
    var ul_id = $('.img-gallery').index(ul);
    var visibleLi = ul.children('li').eq(visibleImage[ul_id]);
    var originalSlide = ul.children('li').not('.loop_clone').filter('[loopid="' + visibleLi.attr('loopid') + '"]');

    ul.find('.loop_clone').not(originalSlide.prev()).not(originalSlide.next()).remove();

    var marginLeft = ul.children('li').not('.loop_clone').first().prevAll('.loop_clone').length
                    * ul.children('li').outerWidth(true)
                    * -1;

    ul.css({
        "transition-duration": "0s",
        "margin-left" : marginLeft + "px",
        "width": ul.children('li').outerWidth(true) * ul.children('li').length + 10 + "px"
    });

    ul[0].offsetHeight; // apply css changes
    ul.css("transition-duration", ulTransitionDuration);

    var toShow = ul.children('li').index(originalSlide);
    // always show, to update visibleImage[...], preview should be set already
    showSlide(ul, parseInt(toShow), false, false);
}

/**
* Zeigt in einem Slider das korrekte slide an.
* Nutzt die korrekte animationsdauer.
* @param ul: Element als JQuery element
* @param ul_id: Index des UL in allen ULs
* @param slide: Index des anzuzeigenden Slides (0 - X)
* @param animate: bool if animation should be done or not (optional)
* @param duration: animation duration, only necessary if animation is true.
*   If not set, this will be the standard ulTransitionDuration
*/
function showSlideLi(ul, ul_id, slide, animate, duration) {
    // set animation
    if(duration == undefined) duration = ulTransitionDuration;
    if(animate) {
        ul.css("transition-duration", duration);
    }
    else if(!animate) {
        ul.css("transition-duration", "0s");
    }
    ul[0].offsetHeight; // apply css changes

    var hasScroll = hasScrollbar();
    if(animate && ul.not('fixed-size').length > 0 && ul.parent().is('.slider')) ul.parent().addClass("switching");
    visibleImage[ul_id] = slide;
    // Die X-Position an die die Transformation stattfindet
    var x = ul.children('li').outerWidth(true)*slide*-1
        + parseFloat(ul.css('margin-left').replace(/[^\d\.]/g, ""));
    if(ul.parent().filter('.slider-nav').length > 0) {
        x = ul.children('li').outerWidth(true)*slide*-4
            + parseFloat(ul.css('margin-left').replace(/[^\d\.]/g, ""));
    }
    ul.css({
        transform: "translate3d(" + x + "px, 0px, 0px)"
    });


    // set timeout to wait for sliding animation
    var oldTimeout = slideSwitchTimeouts[ul_id];
    var timeoutDuration = parseFloat(duration.replace(/[^\d\.]/g, "")) * 1000;
    if(!animate) timeoutDuration = 0;

    clearTimeout(oldTimeout);
    var newTimeout = setTimeout(function() {
        var height = $(ul.children('li')[visibleImage[ul_id]]).height();
        // start height change animation; only for variable height sliders
        if(ul.not('fixed-size').length > 0 && ul.parent().is('.slider')){
            var animationDuration = 500;
            if(!animate) {
                // will be ulTransitionDuration if duration is not set explicitly
                animationDuration = parseFloat(duration.replace(/[^\d\.]/g, "")) * 1000;
            }
            ul.parent().animate({height: height + "px"}, animationDuration, function() {
                ul.parent().removeClass("switching");
                if(hasScrollbar() != hasScroll) {
                    resizeAllSliders();
                }
            });
        }
        else {
            ul.parent().removeClass("switching");
        }
    }, timeoutDuration);
    slideSwitchTimeouts[ul_id] = newTimeout;

    ul[0].offsetHeight; // apply css changes
    ul.css("transition-duration", ulTransitionDuration);
}

/**
* Zeigt den Beschreibungstext zu einem bestimmten Slide in einem bestimmten ul
* an.
* @param ul: Element als JQuery element
* @param slide: Index des anzuzeigenden Slides (0 - X)
*/
function showSlideDescription(ul, slide) {
    var p = ul.children('li').eq(slide).children('p');
    var descDiv = ul.parent().parent().nextAll('.slider-description').first();
    if(p.length > 0) {
        descDiv.text(p.text());
        descDiv.show();
    }
    else {
        descDiv.text("");
        descDiv.hide();
    }
}

/**
* Zeigt nur die Links und Rechts Buttons an die Möglich sind.
* @param ul - das <ul> in dem sich das Bild an Stelle "slide" befindet
* @param slide - die Stelle / Nummer des Bildes im <ul> (startet mit 0)
* @param isNavigation - true wenn Navigations/Preview-Slider, false sonst.
*/
function showSlideButtons(ul, slide, isNavigation) {
    if(slide > 0 || ul.parent().filter('.loop').length > 0) {
        ul.parent().nextAll('.slider-back-area').show();
    }
    else {
        ul.parent().nextAll('.slider-back-area').hide();
    }
    if((isNavigation && (slide+1)*4 < ul.children('li').length) || (!isNavigation && slide+1 < ul.children('li').length)
        || ul.parent().filter('.loop').length > 0) {
        ul.parent().nextAll('.slider-next-area').show();
    }
    else {
        ul.parent().nextAll('.slider-next-area').hide();
    }
}

/**
* Gibt die originale Dimension der Bilddatei zurück
* @param img - ein <img> Element
* @param callback - function(width, height) in der etwas mit der Größe
*   gemacht werden kann.
*/
function getImageSize(img, callback){
    img = $(img);

    var wait = setInterval(function(){
        var w = img.width(),
            h = img.height();

        if(w && h){
            done(w, h);
        }
    }, 0);

    var onLoad;
    img.on('load', onLoad = function(){
        done(img.width(), img.height());
    });


    var isDone = false;
    function done(){
        if(isDone){
            return;
        }
        isDone = true;

        clearInterval(wait);
        img.off('load', onLoad);

        callback.apply(this, arguments);
    }
}

/**
* Zoomt in ein Bild aus einem Slider. (Lightbox mit Bild)
*/
function zoomImage(button) {
    var ul = $(button).prevAll('div').find('.img-gallery').first();
    var vimg = visibleImage[$('.img-gallery').index(ul)];
    $('.img-lightbox').append($(ul.find('img')[vimg]).clone().css('max-height', ''));
    $('.image-zoom-container').show();
    var img = $('.img-lightbox').find('img');
    img.css('margin-left', (parseInt(img.css('margin-left').replace("px","")) - $('.img-lightbox').find('.close').width() -1) + "px");
    $('.img-lightbox').css('top', ($(document).scrollTop() + ($(window).height()-80)/2 - img.height()/2) + "px");
    var leftmargin = parseInt(img.css('margin-left').replace("px",""))+img.width()-5;
    $('.img-lightbox').find('.close').css('left', leftmargin + "px");
    var bottommargin = parseInt(img.css('margin-bottom').replace("px",""))+img.height()-20;
    $('.img-lightbox').find('.close').css('bottom', bottommargin + "px");
}

/**
* Schließt das Zoom fenster, wenn nicht auf das Bild geklickt wurde.
*/
function closeZoom(button) {
    $(button).parent().hide();
    var lb = $(button).parent().find('.img-lightbox');
    lb.find('img').remove();
}

// var für Timeout des resizes
var resizeTimerSliders = null;

/**
* Passt alle Slider und auch das Zoom Fenster an die Fenstergröße des Browsers
* an.
* @event: Fires "ejssliderresize"event on document when done successfully.
*/
function resizeAllSliders() {
    clearTimeout(resizeTimerSliders);
    resizeTimerSliders = setTimeout(function() {
        resizeSliders();
        resizeNavigationSliders();
        resizeZoomContainer();

        fireEvent(document, createEvent("ejssliderresize", {}));
    }, 250);

}

/**
* Passt alle Bildergallerien (normalen Slider) an neue Fenstergröße an.
*/
function resizeSliders() {
    $('.slider:visible').each(function() {
        var slider = $(this);
        var ul = slider.children('ul.img-gallery');
        var ul_id = $('.img-gallery').index(ul);

        // width did not change since last update
        if(lastSliderDimensions[ul_id] != undefined
            && lastSliderDimensions[ul_id].width == slider.width()) {
            // continue
            return true;
        }

        // clear timeouts
        if(slider.is('.switching')) {
            clearTimeout(slideSwitchTimeouts[ul_id]);
            clearTimeout(loopTimeouts[ul_id]);
            slider.removeClass("switching");
        }

        ul.css("transition-duration", "0s");
        ul[0].offsetHeight; // apply css changes
        ul.find('img').css({'max-height': ''});

        var slide = visibleImage[ul_id];
        var heights = 0;
        var testedImages = 0;
        slider.children('ul.img-gallery').children('li').each(function(i, e) {
            var li = $(this);
            li.css("width", slider.width() + "px");
            getImageSize(li.children("img"), function(width, height){
                if(li.children('p').length > 0) {
                    li.children('p').height();
                }
                if(ul.is('.fixed-size')) {
                    testedImages++;
                    heights = Math.max(height, heights);
                    if(testedImages == ul.children('li').length) {
                        if(ul.css("max-height") != "none") {
                            heights = Math.min(heights, ul.css("max-height").replace("px", ""));
                        }
                        if(slider.css("max-height") != "none") {
                            heights = Math.min(heights, slider.css("max-height").replace("px", ""));
                        }
                        ul.children('li').css('height', heights + "px");
                        slider.css("height", heights + "px");
                    }
                }
                else {
                    var maxHeight = height + "px";
                    if(height > parseFloat(ul.css("max-height").replace("px", "")) && ul.css("max-height") != "none" ) {
                        maxHeight = ul.css("max-height");
                    }
                    if(height > parseFloat(slider.css("max-height").replace("px", "")) && slider.css("max-height") != "none" ) {
                        maxHeight = slider.css("max-height");
                    }
                    li.css("height", maxHeight);
                    if(i == slide) {
                        //if(li.children('p').length > 0) {
                        //    maxHeight = height + li.children('p').height() + "px";
                        //}
                        slider.css("height", maxHeight);
                    }
                }
                li.children('img').css('max-height', '100%');
            });
        });
        var x = ul.children('li').outerWidth(true)*slide*-1;
        var marginLeft = ul.children('li').not('.loop_clone').first().prevAll('.loop_clone').length
                        * ul.children('li').outerWidth(true)
                        * -1;
        ul.css({
            // + 10 for safety, +1 or ceil should be enough though
            width: ul.children('li').outerWidth(true) * ul.children('li').length + 10 + "px",
            "margin-left" : marginLeft + "px",
            transform: "translate3d(" + x + "px, 0px, 0px)"
        });
        ul[0].offsetHeight; // apply css changes
        ul.css("transition-duration", ulTransitionDuration);
        showSlide(ul, visibleImage[ul_id], false, false, "0s");

        updateSliderDimensions(ul);
    });
}

/**
* Passt alle Slider Navigationen an neue Fenstergröße an.
*/
function resizeNavigationSliders() {
    $('.slider-nav:visible').each(function() {
        var slider = $(this);
        var ul = slider.children('ul.img-gallery');
        var ul_id = $('.img-gallery').index(ul);
        var slide = visibleImage[$('.img-gallery').index(ul)];
        var fullWidth = slider.width();
        var liWidth = fullWidth / 4.5;
        var liHeight = fullWidth / 6.0;

        // width did not change since last update
        if(lastSliderDimensions[ul_id] != undefined
            && lastSliderDimensions[ul_id].width == slider.width()) {
            // continue
            return true;
        }

        // clear transition duration
        ul.css("transition-duration", "0s");
        ul[0].offsetHeight; // apply css changes

        ul.children('li').css({
            width: liWidth + "px",
            height: liHeight + "px"
        });
        var x = ul.children('li').outerWidth(true)*slide*-4;
        ul.css({
            width: ul.children('li').outerWidth(true) * (ul.children('li').length) + 10 + "px",
            height: liHeight + "px",
            transform: "translate3d(" + x + "px, 0px, 0px)"
        });
        // Set Image Size
        var alerted = false;
        // Zur korrekten größen Berechnung muss das zurückgesetzt werden.
        ul.children('li').find('img').css({"width":"", "height":""});
        ul.children('li').find('img').each(function(i,e) {
            var img = $(this);
            getImageSize(img, function(width, height){
                if(liHeight > 0) {
                    var ratio = width/height;
                    if(ratio > 4/3) {
                        var newWidth = (liHeight * ratio);
                        var leftPx = liWidth/2 - newWidth/2;
                        img.css("height", "100%");
                        img.css("width", 75*ratio + "%");
                        img.css("left", leftPx + "px");
                        img.css("top", "");
                    }
                    else if(ratio < 4/3) {
                        img.css("width", "100%");
                        var topPx = liHeight/2 - (liWidth * (1/ratio))/2;
                        img.css("height", "");
                        img.css("left", "");
                        img.css("top", topPx + "px");
                    }
                }
            });
        });
        slider.css("height", liHeight + "px");

        // reset transition duration
        ul[0].offsetHeight;
        ul.css("transition-duration", ulTransitionDuration);

        updateSliderDimensions(ul);
    });
}

/**
* Passt Zoom Container an neue Fenstergröße an.
*/
function resizeZoomContainer() {
    if($('.image-zoom-container:visible').is(':visible')) {
        var img = $('.img-lightbox').find('img');
        img.css('margin-left', "");
        img.css('margin-left', (parseInt(img.css('margin-left').replace("px","")) - $('.img-lightbox').find('.close').width() -1) + "px");
        var leftmargin = parseInt(img.css('margin-left').replace("px",""))+img.width()-5;
        $('.img-lightbox').find('.close').css('left', leftmargin + "px");
        var bottommargin = parseInt(img.css('margin-bottom').replace("px",""))+img.height()-20;
        $('.img-lightbox').find('.close').css('bottom', bottommargin + "px");
    }
}


// --------------------------------------------------------------------------------------
// Tooltips
// --------------------------------------------------------------------------------------

var activeTooltip = 0;
/*
* One tooltip is an object containing following keys:
* Necessary:
* - html: containing the whole html which should be displayed.
*   usually wrapped in an div.tooltip
* Optional:
* - condition: a function returning a bool to
*   define if the tooltip should be displayed or not
* - anchor: the tag for an object to which this TT is aligned to
*   e.g. "#btnBack" to position the Tooltip to point at #btnBack
*   Important: the anchor has to be visible, otherwise the tt-condition
*   will be false
* - offset: an object like {top: "5px", left: "5px", bottom: "5px", right: "100px"}
*   this offset will be set as margin added to the anchor position.
*   All key-values are optional, so e.g. only top can be defined
*/
var tooltips =
[
    {
        html : '<div id="tooltipBack" class="tooltip fixed">'
            + 'Verlinkt normalerweise auf eine <br>vorangegane Seite oder den Anfang <br>des Dokuments.'
            + '</div>',
        condition : isBackButtonEnabled,
        anchor : "#btnBack"
    },
    {
        html : '<div id="tooltipShowAll" class="tooltip fixed">'
            + 'Alle Inhalte auf einer Seite anzeigen <br>oder horizontal navigierbar machen.'
            + '</div>',
        anchor : "#btnAll"
    },
    {
        html : '<div id="tooltipChapter" class="tooltip fixed">'
            + 'Klappt die Kapitelübersicht zur schnellen <br>Navigation aus bzw. ein.'
            + '</div>',
        anchor : "#btnExp"
    },
    {
        html : '<div id="tooltipMenu" class="tooltip fixed right">'
            + 'Öffnet ein Menü mit Optionen zum Drucken <br>und Teilen der Seite sowie der Anzeige von <br>Informationen.'
            + '</div>',
        anchor : "#btnMenu"
    },
    {
        html : '<div id="tooltipArrowRight" class="tooltip fixed right">'
            + 'Klicken, um auf die nächste Seite zu wechseln.'
            + '</div>',
        condition: function() {return $(window).width() > 440}
    },
    {
        html : '<div id="tooltipArrowLeft" class="tooltip fixed left">'
            + 'Klicken, um auf die vorherige Seite zu wechseln.'
            + '</div>',
        condition: function() {return $(window).width() > 440}
    },
    {
        html : '<div id="tooltipTouchRight" class="tooltip fixed right">'
            + 'Wischen, um auf die nächste Seite zu wechseln.'
            + '</div>',
        condition: isTouchSupported
    },
    {
        html : '<div id="tooltipTouchLeft" class="tooltip fixed left">'
            + 'Wischen, um auf die vorherige Seite zu wechseln.'
            + '</div>',
        condition: isTouchSupported
    }
];

/**
* Fügt die Buttons und die Funktionen der Buttons hinzu, die zum Durchklicken der
* Tooltips bzw. zum Schließen nötig sind.
*/
function initiateTooltips() {
    for(var i=0, tt=tooltips[0]; i<tooltips.length; i++, tt=tooltips[i]) {
        $('.page').before(tt.html);
    }
    $('.tooltip').prepend('<div id="cancel">x</div>');
    $('.tooltip').append('<div><button id="next">Nächster</button></div>');
    $('.tooltip').find('#cancel').click(function() {
        activeTooltip = 0;
        closeTooltips();
    });
    $('.tooltip').find('#next').click(function() {
        nextTooltip();
    });
}

/**
* Wird von dem "Hilfe" Button aufgerufen. Öffnet den ersten Tooltip.
*/
function startHelp() {
    showTooltip(0);
}

/**
* Zeigt den Tooltip mit der übergebenen Nummer an.
* (id = "tooltipX" : mit X - Nummer des Tooltips)
*/
function showTooltip(nr) {
    var tooltip = tooltips[nr];

    closeTooltips();
    // invalid tooltip
    if($('.tooltip').length <= nr || nr < 0) {
        activeTooltip = 0;
        return;
    }

    activeTooltip = nr;
    // Tooltip condition is true and anchor is visible if defined
    if((tooltip.condition == undefined
            || tooltip.condition())
        && (tooltip.anchor == undefined
            || $(tooltip.anchor).is(':visible'))) {

        // get base margins [might be undefined]: copy to not overwrite original
        var margin = $.extend(true, {}, tooltip.offset);

        // align to anchor if set
        if(tooltip.anchor != undefined) {
            var anchor = $(tooltip.anchor);

            // calculate positions based on anchor
            var offsetTop = anchor.offset().top
                - $(document).scrollTop()
                + parseInt(anchor.css("margin-top").replace(/\D/g, "")) + 38;

            var offsetLeft = anchor.offset().left
                + parseInt(anchor.css("margin-left").replace(/\D/g, ""))
                - $('#wrap').offset().left - 10;

            // update margin top
            if(margin.top != undefined)
                margin.top = "calc(" + margin.top + " + " + offsetTop + "px)";
            else margin.top = offsetTop + "px";

            // update margin right
            if($($('.tooltip')[nr]).is(".right")) {
                if(margin.right != undefined)
                    margin.right = "calc(" + margin.right + " + "
                        + ($('#wrap').width() - offsetLeft - 50) + "px)";
                else margin.right = ($('#wrap').width() - offsetLeft - 50) + "px";
            }
            // update margin left
            else {
                if(margin.left != undefined)
                    margin.left = "calc(" + margin.left + " + " + offsetLeft + "px)";
                else margin.left = offsetLeft + "px";
            }
        }

        setTooltipMargin(nr, margin);

        // display the tooltip
        $($('.tooltip')[nr]).show();
    }
    // tooltip condition is false, try to display next
    else {
        nextTooltip();
        return;
    }
}

/**
* Setzt den Tooltip margin am tatsächlichen HTML Element. Nutzt @param nr als
* index des tooltips
*/
function setTooltipMargin(nr, margin) {
    if(margin == undefined) return;

    if(margin.top != undefined) {
        $($('.tooltip')[nr]).css("margin-top", margin.top);
    }
    if(margin.bottom != undefined) {
        $($('.tooltip')[nr]).css("margin-bottom", margin.bottom);
    }
    if(margin.left != undefined) {
        $($('.tooltip')[nr]).css("margin-left", margin.left);
    }
    if(margin.right != undefined) {
        $($('.tooltip')[nr]).css("margin-right", margin.right);
    }
}

/**
* Zeigt den nächsten Tooltip an. (Eine Nummer weiter)
*/
function nextTooltip() {
    showTooltip(activeTooltip+1);
}

/**
* Schließt alle Tooltips.
*/
function closeTooltips() {
    $('.tooltip').hide();
}



// --------------------------------------------------------------------------------------
// Hideables
// --------------------------------------------------------------------------------------

function initiateHideables() {
    $('.hideable').each(function() {
        var div = $(this);
        div.wrap('<div class="hideable-container"></div>');
        div.before('<button onclick="toggleHideable(this);">'
                        + div.attr('show') + " " + div.attr('name')
                        + '</button>');

        div.hide();
    });
}

function toggleHideable(element) {
    var div = $(element).nextAll().first('.hideable');

    // hide
    if(div.is(':visible')) {
        div.hide();
        $(element).html(div.attr('show') + " " + div.attr('name'));
    }
    // show
    else {
        div.show();
        $(element).html(div.attr('hide') + " " + div.attr('name'));
    }
}

// --------------------------------------------------------------------------------------
// Tabbed boxes
// --------------------------------------------------------------------------------------

function initiateTabbedBoxes() {
    $('.tabbed-box').each(function() {
        initiateTabbedBox($(this));
    });
}

function initiateTabbedBox(box) {
    var div = box;

    div.wrap('<div class="tabbed-container"></div>');

    div.before('<div class="tabs"></div>');

    var tabs = div.parent().find('.tabs');

    div.find('.tab').each(function() {
        var tab = $(this);
        tabs.append('<div class="tab-select" onclick="selectTab(this);">'
                        + tab.attr('name')
                        + '</div>');
    });

    // set active tab to first
    div.find('.tab').hide();
    div.find('.tab').first().show();
    tabs.find('.tab-select').first().addClass('act');

    div.closest('.tabbed-container')[0].addEventListener("ejstabchange", resizeAllSliders);
}

/**
* Selects a tab of a tabbed box
* @param elemt, the tab element clicked on
* @event: Fires "ejstabchange"event on the .tabbed-container when done successfully.
*/
function selectTab(element) {
    var e = $(element);
    var div = e.parent().nextAll().first('.tabbed-box');

    var tabbefore = div.find('.tab:visible').attr("name");

    // show only new
    div.find('.tab').hide();
    div.find('.tab').filter('[name="' + e.html() + '"]').show();
    e.parent().find('.tab-select').removeClass("act");
    e.addClass("act");

    var eventObj = {
        "tab": e.html(),
        "tabbefore" : tabbefore};
    fireEvent(div.closest('.tabbed-container')[0], createEvent("ejstabchange", eventObj));
}


// --------------------------------------------------------------------------------------
// Hover Infos
// --------------------------------------------------------------------------------------

function initiateHoverInfos() {
    $('.hover-info').each(function() {
        var div = $(this);

        var title = div.clone().children().remove().end().html();
        var children = div.clone().children();

        div.html("");
        div.append("<div class='title'>" + title + "</div>");
        div.append(children);

        title = div.children('.title');
        title.append('<span class="icon-info">');

        var info = div.children('div').last();
        info.addClass("hide");
        info.addClass("hover-info-block");

        div.on('mouseenter', function(event) {
            if(!isTouchSupported())
                hoverInfoShow(div);
        });
        div.on('mouseleave', function(event) {
            hoverInfoHide(div);
        });
        title.on('click', function(event) {
            hoverInfoTrigger(div);
        });
    });
}

function hoverInfoSetPositions() {
    $('.hover-info').each(function() {
        hoverInfoSetPosition($(this));
    });
}

function hoverInfoSetPosition(div) {
    var min_width = 200;
    var perc_from = 400;

    var width = 0;
    if(div.closest('section').width() > perc_from) {
        width = div.closest('section').width() * 0.5;
    }
    else if(div.closest('section').width() < min_width){
        width = min_width;
    }
    else {
        var fact = 1 - ((div.closest('section').width() - min_width) / ((perc_from - min_width)*2));
        width = div.closest('section').width() * fact;
    }

    var left = "auto";
    var right = "auto";
    if(($(window).width() - div.offset().left)
            > (div.offset().left + div.outerWidth(true))) {
        left = div.offset().left;
        margin = "0 1em 0 0";
    }
    else {
        right = $(window).width() - div.offset().left - div.outerWidth(true);
        margin = "0 0 0 1em";
    }

    var parent = div.closest('section');

    var info = div.children('div.hover-info-block');

    info.css({
        "top": div.offset().top + div.outerHeight(true),
        "left": left,
        "right": right,
        "margin": margin,
        "max-width": width
    });
}

function hoverInfoShow(div) {
    var info = div.children('div.hover-info-block');
    info.removeClass("hide");

    hoverInfoSetPosition(div);
}

function hoverInfoHide(div) {
    var info = div.children('div.hover-info-block');
    info.addClass("hide");
}

function hoverInfoTrigger(div) {
    var info = div.children('div.hover-info-block');
    if(info.is('.hide')) {
        hoverInfoShow(div);
    }
    else {
        hoverInfoHide(div);
    }
}

// --------------------------------------------------------------------------------------
// Stop Videos
// --------------------------------------------------------------------------------------

/**
* Stops all videos on the page. Usually called when another section is displayed.
*/
function stopVideos() {
    // stop all HTML5 videos
    $('video').each(function() {this.pause()});
    $('audio').each(function() {this.pause()});

    /*
    // set hsrc from src and set src to "" so the video stops
    // cannot be reset directly because it only loads if visible.
    $('.strobemediaplayback-video-player').not(':visible').each(function() {

        // if not set already
        if($(this).attr("hsrc") == undefined
            || $(this).attr("hsrc") == null
            || $(this).attr("hsrc").length == 0)
        {
            $(this).attr("hsrc", this.src);
            this.src = "";
        }
    });

    // reload sources for every lecture2go video
    // set source from hsrc (hidden source, set below)
    $('.strobemediaplayback-video-player:visible').each(function() {
        if($(this).attr("hsrc") != undefined
            && $(this).attr("hsrc") != null
            && $(this).attr("hsrc").length > 0)
        {
            this.src = $(this).attr("hsrc");
            $(this).attr("hsrc", "");
        }
    });
    */
}

// --------------------------------------------------------------------------------------
// Window RESIZING
// --------------------------------------------------------------------------------------
var resizeTimer;

/**
* Berechnet alle notwendigen Größen neu.
*/
$(window).resize(function() {
    windowOnResize();
});

$(window).on('scrollbarVisible', function() {
    windowOnResize();
});
$(window).on('scrollbarHidden', function() {
    windowOnResize();
});

/**
* Called on window resize
* @event: Fires "ejswindowresize" + " ejswindowresizelate"
*   event on the window when done successfully.
*/
function windowOnResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
        if(isSideMenuVisible()) {
            $('#sideMenu').css('right', "0");
        }
        else {
            $('#sideMenu').css('right', "-"+($('#sideMenu').width()+10)+"px");
        }

        fireEvent(window, createEvent("ejswindowresize", {}));
        fireEvent(window, createEvent("ejswindowresizelate", {}));
    }, 250);
    updateNavBarWidth();
    hoverInfoSetPositions();
}

// --------------------------------------------------------------------------------------
// KeyPress Part (Arrow Left/Right)
// --------------------------------------------------------------------------------------
/**
* Fügt Pfeiltastennavigation durch Sections hinzu.
*/
$(document).keydown(function(e){
    if(!allShown && keyNavigationEnabled) {
        if(e.keyCode == 37
            && !$(document.activeElement).is('input')
            && !$(document.activeElement).is('textarea')
            && $(document.activeElement).attr("contentEditable") != "true") {
            showPrev();
        }
        else if(e.keyCode == 39
            && !$(document.activeElement).is('input')
            && !$(document.activeElement).is('textarea')
            && $(document.activeElement).attr("contentEditable") != "true") {
            showNext();
        }
    }
});


/**
* Aktiviert oder Deaktiviert Tastaturnavigation
*/
function setKeyNavigationEnabled(b) {
    keyNavigationEnabled = b;
}

function isKeyNavigationEnabled() {
    return keyNavigationEnabled;
}



/**
* Überprüft ob eine URL existiert.
* @param url : URL als String (inkl. http:// )
* @param callback : function(exists) {...}
*   wird aufgerufen, nachdem die Funktion abgeschlossen ist.
*/
function doesURLExist(url, callback) {
    $.ajax({
        url: url,
        type:'HEAD',
        error: function()
        {
            callback(false);
        },
        success: function()
        {
            callback(true);
        }
    });
}

/**
* Checks if an object is a function
*/
function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var wrapDimensions = {width: 0, height: 0};

/**
* Checks the size of #wrap.
* Will set the wrapDimensions object to the actual size
* @return whether it changed or not
*/
function checkWrapResize() {
    var changed = false;
    var wrap = $('#wrap');

    if(wrap.width() != wrapDimensions.width
        || wrap.height() != wrapDimensions.height) {
        changed = true;
        wrapDimensions.width = wrap.width();
        wrapDimensions.height = wrap.height();
    }

    return changed;
}

/**
* Will send a @param message to the windows parent
*/
function notifyIFrameParent(message) {
    window.parent.postMessage(message, '*');
}

/**
* Will check the wrap size and notify IFrameParent if it did change
*/
function updateWrapSize() {
    if(checkWrapResize()) {
        notifyIFrameParent({action: eLearnJS.actions.CONTENT_RESIZE, dimensions: wrapDimensions});
    }
}

// --------------------------------------------------------------------------------------
// Touch Scroll part
// --------------------------------------------------------------------------------------

var clickedAlready = false;

var touchMouseChangeTimer = null;
var lastTouch = undefined;

/**
* Simply returns the current touchSupported var value
* This value will not really return if touch is supported, but if it is
* actively used. So it returns if the last event was a touch event or a mouse
* was used. This way it can swap, based on the users preference.
*/
function isTouchSupported() {
    return touchSupported;
}

/**
* Initiates the touch detection.
* This will set listeners to specific events which can detect
*/
function initiateTouchDetection() {
    $(document).bind('touchstart', function(event) {
        lastTouch = new Date().getTime();
        clearTimeout(touchMouseChangeTimer);
        if(!touchSupported) {
            touchSupported = true;
            touchSupportedChanged();
        }
    });
    $(document).bind('mousemove', function(event) {
        // asynchronous for touch events fired afterwards
        touchMouseChangeTimer = setTimeout(function() {
            // more than 2s ago
            if(touchSupported && lastTouch < new Date().getTime() - 2000) {
                touchSupported = false;
                touchSupportedChanged();
            }
        }, 200);
    });
}

/**
* Will call all functions registered on touchSupportedChanged
* @event: Fires "ejstouchmousechange" event on the window when done successfully.
*/
function touchSupportedChanged() {
    fireEvent(window, createEvent("ejstouchmousechange", {}));
}

/**
* Adds a listener function called on touch support/usage changes.
*
* @deprecated Since version 1.0.0. Simply add the event listener yourself.
*   this makes better event handling possible.
*/
function addTouchMouseChangeListener(key, fnc) {
    window.addEventListener("ejstouchmousechange", fnc);
}



/**
* Aktiviert oder deaktiviert generell den Sectionwechsel per touch
*/
function generalSectionSwipeEnabled(b) {
    secSwipeEnabled = b;
}

/**
* Gibt zurück, ob der Sectionwechsel per touch aktiviert ist.
*/
function isSectionSwipeEnabled() {
    return secSwipeEnabled;
}

/**
* Fügt allen Sections eine Touchabfrage hinzu.
*/
function addTouchToSections() {

    document.addEventListener('touchstart',
    function(event) {
        if(secSwipeEnabled) {
            touchStart(event, this);
        }
    });
    document.addEventListener('touchmove',
        function(event) {
            if(secSwipeEnabled) {
                touchMove(event);
            }
        },
        {passive: false}
    );
    document.addEventListener('touchend', function(event) {
        if(secSwipeEnabled) {
            touchEnd(event);
        }
    });
    document.addEventListener('touchcancel', function(event) {
        if(secSwipeEnabled) {
            touchCancel(event);
        }
    });

    resizeTouchArrows();
    window.addEventListener("ejswindowresize", resizeTouchArrows);
};

/**
* Sets max swipe width for section changes by swiping
*/
function resizeTouchArrows() {
    var maxDiff = $("body").width()/4;
    $('#leftTouch').css('width', maxDiff-1);
    $('#rightTouch').css('width', maxDiff-1);
    $('#leftTouch').css('left', '-' + maxDiff + 'px');
    $('#rightTouch').css('right', '-' + maxDiff + 'px');
}


// TOUCH-EVENTS SINGLE-FINGER SWIPE-SENSING JAVASCRIPT
// Courtesy of PADILICIOUS.COM and MACOSXAUTOMATION.COM

// this script can be used with one or more page elements to perform actions based on them being swiped with a single finger

var triggerElementID = null; // this variable is used to identity the triggering element
var fingerCount = 0;
var startX = -1;
var startY = -1;
var curX = -1;
var curY = -1;
var swipeLength = 0;
var swipeAngle = null;
var swipeDirection = null;
var swipeStarted = false;
var isHorizontalSwipe = true;
var swipeDirectionSet = false;
var swipeType = "normal";
var swipeTarget = null;
var lastSpeed = 0;
var lastTime = undefined;
var lastDif = undefined;
var startScrollLeft = 0;

var touchDeactivatedElements = {};

function registerTouchDeactivatedElement(key, elem) {
    if(touchDeactivatedElements[key] == undefined
        || touchDeactivatedElements[key] == null) {
        touchDeactivatedElements[key] = elem;
    }
    else if(!touchDeactivatedElements[key].is(elem)) {
        Array.prototype.push.apply(touchDeactivatedElements[key], elem);
    }
}

function removeTouchDeactivatedElement(key) {
    delete touchDeactivatedElements[key];
}

/**
* Überprüft, um welche Touchfunktion es sich handelt.
* Abhängig davon, welches Element berührt wurde und in welche Richtung sich der Finger
* bewegt.
*/
function setSwipeType() {
    var swipeTypeSet = false;
    $.each(touchDeactivatedElements, function(key, elem) {
        if(swipeTarget.is(elem)) {
            swipeType = "normal";
            swipeTypeSet = true;
            return false;
        }
    });

    if(!swipeTypeSet) {
        if(swipeTarget.is('.slider') || swipeTarget.is('.slider *')
            || swipeTarget.is('.slider-nav') || swipeTarget.is('.slider-nav *')) {
            swipeType = "slider";

            var ul = $(swipeTarget);
            while(ul.filter('.slider').length == 0 && ul.filter('.slider-nav').length == 0) {
                ul = ul.parent();
            }
            ul = ul.children("ul.img-gallery");
            swipeTarget = ul;
            ul.css("transition-duration", "0s");
        }
        // else if($(window).width() - (event.touches[0].pageX - $(document).scrollLeft()) < 20 && !isSideMenuVisible()) {
            // swipeType = "menu";
            // $('.menu-wrap').css('top', $('#navigation').height() + "px");
        // }
        else if(isSideMenuVisible()) {
            swipeType = "menu-back";
            $('.menu-wrap').css('top', $('#navigation').height() + "px");
        }
        else if(!allShown
            && !swipeTarget.is("code") // Kein Code Element
            && (parseInt(swipeTarget.prop("scrollWidth")) <= Math.ceil(swipeTarget.innerWidth())
                || swipeTarget.css("overflow-x") == 'hidden')) // Element nicht horizontal scrollbar
        {
            swipeType = "section";
        }
        else {
            swipeType = "normal";
        }
    }
}

/**
* Will reset swipe type if it is not an horizontal movement
*/
function checkSwipeType() {
    if(!isHorizontalSwipe) swipeType = "normal";
}

/**
* Called on touch start.
* Will set inital values for movement. Or cancel if it is multi finger touch.
*/
function touchStart(event,passedName) {
    swipeTarget = $(event.target);
    setSwipeType();

    startScrollLeft = $(document).scrollLeft();

    fingerCount = event.touches.length;
    if (fingerCount == 1) {
        swipeStarted = true;
        startX = event.touches[0].pageX;
        startY = event.touches[0].pageY;
        curX = event.touches[0].pageX;
        curY = event.touches[0].pageY;
        triggerElementID = passedName;
    } else {
        touchCancel(event);
    }
}

/**
* Called on touch move.
* Will update values and distinguish between swipe types for further processing.
*/
function touchMove(event) {
    fingerCount = event.touches.length;
    if (swipeStarted && fingerCount == 1) {
        curX = event.touches[0].pageX;
        curY = event.touches[0].pageY;

        if(!swipeDirectionSet) {
            setSwipeDirection();
            checkSwipeType();
        }

        if((isHorizontalSwipe && swipeType != "section" && swipeType != "normal")
            || (isHorizontalSwipe && swipeType == "section" && Math.abs(lastDif) > 12)) {
            //event.preventDefault();
        }

        var dif = startX - curX;
        calcSpeed(dif);

        if(isHorizontalSwipe) {
            if(swipeType == "section") {
                touchMoveSection(dif);
                event.preventDefault();
            }
            if(swipeType == "menu" && dif > 0) {
                touchMoveMenu(dif);
            }
            if(swipeType == "menu-back") {
                touchMoveMenu($('#sideMenu').width() + dif);
            }
            if(swipeType == "slider") {
                touchMoveSlider(dif, swipeTarget);
            }
        }
    } else {
        touchCancel(event);
    }
}

/**
* Ends a touch event. Calculates speed and processes the whole touch movement
* based on the swipeType
*/
function touchEnd(event) {
    var maxDiff = $("body").width()/4;
    calcSpeed(startX - curX);
    if (swipeStarted && fingerCount == 1 && curX >= 0 ) {
        //swipeLength = Math.round(Math.sqrt(Math.pow(curX - startX,2) + Math.pow(curY - startY,2)));
        if((swipeType == "menu" || swipeType == "menu-back") && !isSideMenuVisible()) {
            touchEndMenu();
        }
        if(swipeType == "slider") {
            touchEndSlider();
        }
        if (swipeType == "section" && Math.abs(curX - startX) >= maxDiff) {
            touchEndSection();
            if(swipeDirection != -1) {
                processingRoutine(swipeDirection, swipeType);
            }
        }
    }
    touchCancel(event);
}

/**
* Resets all touch values.
*/
function touchCancel(event, dir) {
    if(triggerElementID != null) {
        fingerCount = 0;
        startX = -1;
        startY = -1;
        curX = -1;
        curY = -1;
        swipeLength = 0;
        swipeAngle = null;
        swipeDirection = null;
        triggerElementID = null;
        isHorizontalSwipe = true;
        swipeDirectionSet = false;
        swipeStarted = false;
        swipeTarget = null;
        lastSpeed = 0;
        lastTime = undefined;
        lastDif = undefined;
        startScrollLeft = 0;
        $('#leftTouch').animate({'margin-left':'0'}, { duration: 200, queue: false });
        $('#rightTouch').animate({'margin-right':'0'}, { duration: 200, queue: false });
        $('#leftTouch').animate({'opacity':'0'}, { duration: 200, queue: false });
        $('#rightTouch').animate({'opacity':'0'}, { duration: 200});
    }
}

/**
* Sets the value for swipe direction
*/
function setSwipeDirection() {
    if(curX != startX || curY != startY) {
        caluculateAngle();
        determineSwipeDirection();
        if(swipeDirection == 'left' || swipeDirection == 'right') {
            isHorizontalSwipe = true;
        }
        else {
            isHorizontalSwipe = false;
        }
        swipeDirectionSet = true;
    }
};

/**
* Calculates and returns an angle for the swipe direction
*/
function caluculateAngle() {
    var X = startX-curX;
    var Y = curY-startY;
    var Z = Math.round(Math.sqrt(Math.pow(X,2)+Math.pow(Y,2)));
    var r = Math.atan2(Y,X);
    swipeAngle = Math.round(r*180/Math.PI);
    if ( swipeAngle < 0 ) { swipeAngle =  360 - Math.abs(swipeAngle); }
}

/**
* Will set the swipe direction based on the current swipeAngle
*/
function determineSwipeDirection() {
    if ( (swipeAngle <= 45) && (swipeAngle >= 0) ) {
        swipeDirection = 'left';
    } else if ( (swipeAngle <= 360) && (swipeAngle >= 315) ) {
        swipeDirection = 'left';
    } else if ( (swipeAngle >= 135) && (swipeAngle <= 225) ) {
        swipeDirection = 'right';
    } else if ( (swipeAngle > 45) && (swipeAngle < 135) ) {
        swipeDirection = 'down';
    } else {
        swipeDirection = 'up';
    }
}

/**
* Processes section swipe based on the direction. Distance or speed
* of swipe movement is not considered
*/
function processingRoutine(dir, type) {
    if(type == "section") {
        if ( dir == 'left' ) {
            showNext();
        } else if ( dir == 'right' ) {
            showPrev();
        } else if ( dir == 'up' ) {
        } else if ( dir == 'down' ) {
        }
    }
}

// ---------------------------------------------------------------------------------------
// Spezialisierte TouchMove Operationen.
// (Werden aufgerufen, wenn sich der Finger auf dem Bildschirm bewegt)
// ---------------------------------------------------------------------------------------

/**
* Wird aufgerufen, wenn wie die aktuelle Touchbewegung Horizontal ist und von einer Section ausgeht.
*/
function touchMoveSection(dif) {
    var maxDiff = $("body").width()/4;
    if(dif >= 0 && visSection < $('section').length - 1) // nach Links streifen, rechts kommt raus
    {
        if(dif > maxDiff) {
            dif = maxDiff;
        }
        $('#rightTouch').css('margin-right', dif.toFixed(2)+'px');
        $('#rightTouch').css('opacity', dif/maxDiff);

        var innerOp = dif/maxDiff;
        if(innerOp < 0.90) {
            innerOp = 0.25;
        }
        else {
            innerOp = ((innerOp-0.90)*7.5) + 0.25;
        }
        $('#rightTouch').find('div').find('p').css('opacity', innerOp);
    }
    else if(dif < 0 && visSection > 0)  // nach rechts streifen, links kommt raus
    {
        dif = dif*(-1);
        if(dif > maxDiff) {
            dif = maxDiff;
        }
        $('#leftTouch').css('margin-left', dif.toFixed(2)+'px');
        $('#leftTouch').css('opacity', dif/maxDiff);

        var innerOp = dif/maxDiff;
        if(innerOp < 0.90) {
            innerOp = 0.25;
        }
        else {
            innerOp = ((innerOp-0.90)*7.5) + 0.25;
        }
        $('#leftTouch').find('div').find('p').css('opacity', innerOp);
    }
}

/**
* Wird aufgerufen wenn momentan die Touchfunktion für das Side-Menu läuft.
*/
function touchMoveMenu(dif) {
    $('#sideMenu').show();
    var width = $('#sideMenu').width();
    if(dif > width) {
        dif = width;
    }
    $('#sideMenu').css("right", (dif - width)+"px");
}

/**
* Wird aufgerufen wenn momentan die Touchfunktion für Slider (Bildergallerien)
* läuft.
*/
function touchMoveSlider(dif, ul) {
    var vimg = visibleImage[$('.img-gallery').index(ul)];
    var marginLeft = ul.children('li').not('.loop_clone').first().prevAll('.loop_clone').length
                    * ul.children('li').outerWidth(true)
                    * -1;
    ul.css("margin-left", marginLeft-dif + "px");
}

// ---------------------------------------------------------------------------------------
// Spezialisierte TouchEnd Operationen.
// (Werden aufgerufen, wenn sich der Finger vom Bildschirm löst.)
// ---------------------------------------------------------------------------------------

function touchEndSection() {
    caluculateAngle();
    determineSwipeDirection();
}

function touchEndSlider() {
    var dif = startX - curX;
    var ul = $(swipeTarget);
    var vimg = visibleImage[$('.img-gallery').index(ul)];
    var marginLeft = ul.children('li').not('.loop_clone').first().prevAll('.loop_clone').length
                    * ul.children('li').outerWidth(true)
                    * -1;
    var margin = parseInt(ul.css("margin-left").replace("px", "")) - marginLeft;
    // set translate to last margin
    var x = -vimg*parseFloat($(swipeTarget).children("li").outerWidth(true));
    if(ul.parent().is('.slider-nav')) {
        x = 4 * x;
    }
    x += margin - marginLeft;
    ul.css({
        transform: "translate3d("+x+"px, 0px, 0px)",
        margin: "0 0 0 0",
        "margin-left": marginLeft + "px"
    });

    // lastSpeed ist px/ms, berechne animationsdauer daraus
    var duration = (ul.parent().width()-dif) / Math.abs(lastSpeed*1000);

    // finish swipe movement in direction
    if(duration < 1 && lastSpeed > 0) {
        vimg++;
    }
    // finish swipe movement in direction
    else if(duration < 1 && lastSpeed < 0) {
        vimg--;
    }
    // atleast half way to next image
    else if(dif > ul.children('li').outerWidth(true)/2 && lastSpeed >= 0) {
        vimg++;
        duration = 0.5;
    }
    // atleast half way to prev image
    else if(dif < -ul.children('li').outerWidth(true)/2 && lastSpeed <= 0) {
        vimg--;
        duration = 0.5;
    }
    // scroll back to active image
    else {
        duration = 0.5;
    }

    showSlide(ul, vimg, true, true, duration+"s");
}


function touchEndMenu() {
    if(lastSpeed > 0.3) {
        $('#sideMenu').animate({
            right: 0,
            }, 200,
            function() {
        });
    }
    else {
        $('#sideMenu').animate({
            right: "-="+$('#sideMenu').width(),
            }, 200,
            function() {
        });
    }
}

// ---------------------------------------------------------------------------------------
// Hilfsfunktionen für Touch-Funktion
// ---------------------------------------------------------------------------------------

/**
* Berechnet die Slide-Geschwindigkeit
* im px/ms
*/
function calcSpeed(dif) {
    var d = new Date();
    var time = d.getTime();

    if(lastDif === undefined || lastTime === undefined) {
        lastDif = dif;
        lastTime = time;
    }
    else {
        lastSpeed = getSpeed(lastDif, lastTime, dif, time);
        if(time - lastTime > 50) //more than 1sec
        {
            //calculate dif 1s before
            var timedif = time - lastTime;
            lastDif = dif - ((50/timedif) * (dif-lastDif));
            lastTime = time - 50;
        }
    }
}

function getSpeed(lastDif, lastTime, dif, time) {
    return (dif-lastDif) / (time - lastTime);
}


function createEvent(eventName, eventObj) {
    var event; // The custom event that will be created

    if (document.createEvent) {
      event = document.createEvent("HTMLEvents");
      event.initEvent(eventName, true, true);
    } else {
      event = document.createEventObject();
      event.eventType = eventName;
    }

    event.eventName = eventName;

    $.each(eventObj, function(k,v) {
        event[k] = v;
    });

    return event;
}

function fireEvent(element, event) {
    if (document.createEvent) {
      element.dispatchEvent(event);
    } else {
      element.fireEvent("on" + event.eventType, event);
    }
}

// Initiates the QueryString object, which contains all url parameters
var QueryString = function () {
  // This function is anonymous, is executed immediately and
  // the return value is assigned to QueryString!
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = pair[1];
    // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [ query_string[pair[0]], pair[1] ];
      query_string[pair[0]] = arr;
    // If third or later entry with this name
    } else {
      query_string[pair[0]].push(pair[1]);
    }
  }
    return query_string;
} ();

var hasScrollbar = function() {
    // The Modern solution
  if (typeof window.innerWidth === 'number')
    return window.innerWidth > document.documentElement.clientWidth

  // rootElem for quirksmode
  var rootElem = document.documentElement || document.body

  // Check overflow style property on body for fauxscrollbars
  var overflowStyle

  if (typeof rootElem.currentStyle !== 'undefined')
    overflowStyle = rootElem.currentStyle.overflow

  overflowStyle = overflowStyle || window.getComputedStyle(rootElem, '').overflow

    // Also need to check the Y axis overflow
  var overflowYStyle

  if (typeof rootElem.currentStyle !== 'undefined')
    overflowYStyle = rootElem.currentStyle.overflowY

  overflowYStyle = overflowYStyle || window.getComputedStyle(rootElem, '').overflowY

  var contentOverflows = rootElem.scrollHeight > rootElem.clientHeight
  var overflowShown    = /^(visible|auto)$/.test(overflowStyle) || /^(visible|auto)$/.test(overflowYStyle)
  var alwaysShowScroll = overflowStyle === 'scroll' || overflowYStyle === 'scroll'

  return (contentOverflows && overflowShown) || (alwaysShowScroll)
}

var scrollbarBefore = false;

/**
* Initiates a scrollbar listener, checking for scrollbar changes regularly.
* Triggers scrollbarVisible and scrollbarHidden events on the window element
* on change.
*/
function initiateScrollBarListener() {
    var hasScroll = hasScrollbar();
    if(hasScroll &&  !scrollbarBefore) {
        $(window).trigger('scrollbarVisible');
    }
    else if(!hasScroll && scrollbarBefore) {
        $(window).trigger('scrollbarHidden');
    }
    scrollbarBefore = hasScroll;
    setTimeout(initiateScrollBarListener, 500);
}



// --------------------------------------------------------------------------------------
// JSON - CSV
// --------------------------------------------------------------------------------------

var CSV_COLUMN_DELIMITER = ";";
var CSV_ROW_DELIMITER = "\n";

/**
* Returns a CSV string parsed from the JSON data.
* JSONData can be a JSON string or object
* Will return false if the json data is invalid
*/
function getCSVFromJSON(JSONData) {
    //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
    var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;


    var csv = '';

    //This will generate the Label/Header
    var row = "";

    //This loop will extract the label from 1st index of on array
    for (var index in arrData[0]) {
        //Now convert each value to string and comma-seprated
        row += '"' + index.replace(/"/g, '""') + '"' + CSV_COLUMN_DELIMITER;
    }
    //append Label row with line break
    csv += row + CSV_ROW_DELIMITER;

    //1st loop is to extract each row
    for (var i = 0; i < arrData.length; i++) {
        var row = "";

        //2nd loop will extract each column and convert it in string comma-seprated
        for (var index in arrData[i]) {
            row += '"' + arrData[i][index].replace(/"/g, '""') + '"' + CSV_COLUMN_DELIMITER;
        }
        //add a line break after each row
        csv += row + CSV_ROW_DELIMITER;
    }

    if (csv == '') {
        return false;
    }

    return csv;
}

function getJSONFromCSV(CSVData) {
    var lines=CSVData.replace(/\r/g, "").split(CSV_ROW_DELIMITER);

    var result = [];

    // extract header values: take quote blocks with trailing DELIMITER
    var cells=lines[0].match(new RegExp('"(?:[^"]|(""))*"' + CSV_COLUMN_DELIMITER, "g"));
    var headers = [];
    // extract headers by removing trailing delimiter
    for(var i=0; i<cells.length; i++) {
        headers.push(
            cells[i]
                .replace(new RegExp(CSV_COLUMN_DELIMITER + "$", "g"), "")
                .replace(/^"/g, "")
                .replace(/"$/g, "")
                .replace(/""/g, '"'));
    }

    // go through lines below header
    for(var i=1;i<lines.length;i++) {
        var obj = {};
        var currentline=lines[i].match(new RegExp('"(?:[^"]|(""))*"' + CSV_COLUMN_DELIMITER, "g"));

        if(!currentline ||
            headers.length > currentline.length) break;

        // go through cells
        for(var j=0;j<headers.length;j++) {
            obj[headers[j]] = currentline[j]
                .replace(new RegExp(CSV_COLUMN_DELIMITER + "$", "g"), "")
                .replace(/^"/g, "")
                .replace(/"$/g, "")
                .replace(/""/g, '"');
        }

        result.push(obj);
    }

    return JSON.stringify(result); //JavaScript object
}


// --------------------------------------------------------------------------------------
// QR Code
// --------------------------------------------------------------------------------------

// Jquery QRCode Generation. Minified.
// from: http://jeromeetienne.github.io/jquery-qrcode/

(function(r){r.fn.qrcode=function(h){var s;function u(a){this.mode=s;this.data=a}function o(a,c){this.typeNumber=a;this.errorCorrectLevel=c;this.modules=null;this.moduleCount=0;this.dataCache=null;this.dataList=[]}function q(a,c){if(void 0==a.length)throw Error(a.length+"/"+c);for(var d=0;d<a.length&&0==a[d];)d++;this.num=Array(a.length-d+c);for(var b=0;b<a.length-d;b++)this.num[b]=a[b+d]}function p(a,c){this.totalCount=a;this.dataCount=c}function t(){this.buffer=[];this.length=0}u.prototype={getLength:function(){return this.data.length},
write:function(a){for(var c=0;c<this.data.length;c++)a.put(this.data.charCodeAt(c),8)}};o.prototype={addData:function(a){this.dataList.push(new u(a));this.dataCache=null},isDark:function(a,c){if(0>a||this.moduleCount<=a||0>c||this.moduleCount<=c)throw Error(a+","+c);return this.modules[a][c]},getModuleCount:function(){return this.moduleCount},make:function(){if(1>this.typeNumber){for(var a=1,a=1;40>a;a++){for(var c=p.getRSBlocks(a,this.errorCorrectLevel),d=new t,b=0,e=0;e<c.length;e++)b+=c[e].dataCount;
for(e=0;e<this.dataList.length;e++)c=this.dataList[e],d.put(c.mode,4),d.put(c.getLength(),j.getLengthInBits(c.mode,a)),c.write(d);if(d.getLengthInBits()<=8*b)break}this.typeNumber=a}this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(a,c){this.moduleCount=4*this.typeNumber+17;this.modules=Array(this.moduleCount);for(var d=0;d<this.moduleCount;d++){this.modules[d]=Array(this.moduleCount);for(var b=0;b<this.moduleCount;b++)this.modules[d][b]=null}this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-
7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(a,c);7<=this.typeNumber&&this.setupTypeNumber(a);null==this.dataCache&&(this.dataCache=o.createData(this.typeNumber,this.errorCorrectLevel,this.dataList));this.mapData(this.dataCache,c)},setupPositionProbePattern:function(a,c){for(var d=-1;7>=d;d++)if(!(-1>=a+d||this.moduleCount<=a+d))for(var b=-1;7>=b;b++)-1>=c+b||this.moduleCount<=c+b||(this.modules[a+d][c+b]=
0<=d&&6>=d&&(0==b||6==b)||0<=b&&6>=b&&(0==d||6==d)||2<=d&&4>=d&&2<=b&&4>=b?!0:!1)},getBestMaskPattern:function(){for(var a=0,c=0,d=0;8>d;d++){this.makeImpl(!0,d);var b=j.getLostPoint(this);if(0==d||a>b)a=b,c=d}return c},createMovieClip:function(a,c,d){a=a.createEmptyMovieClip(c,d);this.make();for(c=0;c<this.modules.length;c++)for(var d=1*c,b=0;b<this.modules[c].length;b++){var e=1*b;this.modules[c][b]&&(a.beginFill(0,100),a.moveTo(e,d),a.lineTo(e+1,d),a.lineTo(e+1,d+1),a.lineTo(e,d+1),a.endFill())}return a},
setupTimingPattern:function(){for(var a=8;a<this.moduleCount-8;a++)null==this.modules[a][6]&&(this.modules[a][6]=0==a%2);for(a=8;a<this.moduleCount-8;a++)null==this.modules[6][a]&&(this.modules[6][a]=0==a%2)},setupPositionAdjustPattern:function(){for(var a=j.getPatternPosition(this.typeNumber),c=0;c<a.length;c++)for(var d=0;d<a.length;d++){var b=a[c],e=a[d];if(null==this.modules[b][e])for(var f=-2;2>=f;f++)for(var i=-2;2>=i;i++)this.modules[b+f][e+i]=-2==f||2==f||-2==i||2==i||0==f&&0==i?!0:!1}},setupTypeNumber:function(a){for(var c=
j.getBCHTypeNumber(this.typeNumber),d=0;18>d;d++){var b=!a&&1==(c>>d&1);this.modules[Math.floor(d/3)][d%3+this.moduleCount-8-3]=b}for(d=0;18>d;d++)b=!a&&1==(c>>d&1),this.modules[d%3+this.moduleCount-8-3][Math.floor(d/3)]=b},setupTypeInfo:function(a,c){for(var d=j.getBCHTypeInfo(this.errorCorrectLevel<<3|c),b=0;15>b;b++){var e=!a&&1==(d>>b&1);6>b?this.modules[b][8]=e:8>b?this.modules[b+1][8]=e:this.modules[this.moduleCount-15+b][8]=e}for(b=0;15>b;b++)e=!a&&1==(d>>b&1),8>b?this.modules[8][this.moduleCount-
b-1]=e:9>b?this.modules[8][15-b-1+1]=e:this.modules[8][15-b-1]=e;this.modules[this.moduleCount-8][8]=!a},mapData:function(a,c){for(var d=-1,b=this.moduleCount-1,e=7,f=0,i=this.moduleCount-1;0<i;i-=2)for(6==i&&i--;;){for(var g=0;2>g;g++)if(null==this.modules[b][i-g]){var n=!1;f<a.length&&(n=1==(a[f]>>>e&1));j.getMask(c,b,i-g)&&(n=!n);this.modules[b][i-g]=n;e--; -1==e&&(f++,e=7)}b+=d;if(0>b||this.moduleCount<=b){b-=d;d=-d;break}}}};o.PAD0=236;o.PAD1=17;o.createData=function(a,c,d){for(var c=p.getRSBlocks(a,
c),b=new t,e=0;e<d.length;e++){var f=d[e];b.put(f.mode,4);b.put(f.getLength(),j.getLengthInBits(f.mode,a));f.write(b)}for(e=a=0;e<c.length;e++)a+=c[e].dataCount;if(b.getLengthInBits()>8*a)throw Error("code length overflow. ("+b.getLengthInBits()+">"+8*a+")");for(b.getLengthInBits()+4<=8*a&&b.put(0,4);0!=b.getLengthInBits()%8;)b.putBit(!1);for(;!(b.getLengthInBits()>=8*a);){b.put(o.PAD0,8);if(b.getLengthInBits()>=8*a)break;b.put(o.PAD1,8)}return o.createBytes(b,c)};o.createBytes=function(a,c){for(var d=
0,b=0,e=0,f=Array(c.length),i=Array(c.length),g=0;g<c.length;g++){var n=c[g].dataCount,h=c[g].totalCount-n,b=Math.max(b,n),e=Math.max(e,h);f[g]=Array(n);for(var k=0;k<f[g].length;k++)f[g][k]=255&a.buffer[k+d];d+=n;k=j.getErrorCorrectPolynomial(h);n=(new q(f[g],k.getLength()-1)).mod(k);i[g]=Array(k.getLength()-1);for(k=0;k<i[g].length;k++)h=k+n.getLength()-i[g].length,i[g][k]=0<=h?n.get(h):0}for(k=g=0;k<c.length;k++)g+=c[k].totalCount;d=Array(g);for(k=n=0;k<b;k++)for(g=0;g<c.length;g++)k<f[g].length&&
(d[n++]=f[g][k]);for(k=0;k<e;k++)for(g=0;g<c.length;g++)k<i[g].length&&(d[n++]=i[g][k]);return d};s=4;for(var j={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,
78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(a){for(var c=a<<10;0<=j.getBCHDigit(c)-j.getBCHDigit(j.G15);)c^=j.G15<<j.getBCHDigit(c)-j.getBCHDigit(j.G15);return(a<<10|c)^j.G15_MASK},getBCHTypeNumber:function(a){for(var c=a<<12;0<=j.getBCHDigit(c)-
j.getBCHDigit(j.G18);)c^=j.G18<<j.getBCHDigit(c)-j.getBCHDigit(j.G18);return a<<12|c},getBCHDigit:function(a){for(var c=0;0!=a;)c++,a>>>=1;return c},getPatternPosition:function(a){return j.PATTERN_POSITION_TABLE[a-1]},getMask:function(a,c,d){switch(a){case 0:return 0==(c+d)%2;case 1:return 0==c%2;case 2:return 0==d%3;case 3:return 0==(c+d)%3;case 4:return 0==(Math.floor(c/2)+Math.floor(d/3))%2;case 5:return 0==c*d%2+c*d%3;case 6:return 0==(c*d%2+c*d%3)%2;case 7:return 0==(c*d%3+(c+d)%2)%2;default:throw Error("bad maskPattern:"+
a);}},getErrorCorrectPolynomial:function(a){for(var c=new q([1],0),d=0;d<a;d++)c=c.multiply(new q([1,l.gexp(d)],0));return c},getLengthInBits:function(a,c){if(1<=c&&10>c)switch(a){case 1:return 10;case 2:return 9;case s:return 8;case 8:return 8;default:throw Error("mode:"+a);}else if(27>c)switch(a){case 1:return 12;case 2:return 11;case s:return 16;case 8:return 10;default:throw Error("mode:"+a);}else if(41>c)switch(a){case 1:return 14;case 2:return 13;case s:return 16;case 8:return 12;default:throw Error("mode:"+
a);}else throw Error("type:"+c);},getLostPoint:function(a){for(var c=a.getModuleCount(),d=0,b=0;b<c;b++)for(var e=0;e<c;e++){for(var f=0,i=a.isDark(b,e),g=-1;1>=g;g++)if(!(0>b+g||c<=b+g))for(var h=-1;1>=h;h++)0>e+h||c<=e+h||0==g&&0==h||i==a.isDark(b+g,e+h)&&f++;5<f&&(d+=3+f-5)}for(b=0;b<c-1;b++)for(e=0;e<c-1;e++)if(f=0,a.isDark(b,e)&&f++,a.isDark(b+1,e)&&f++,a.isDark(b,e+1)&&f++,a.isDark(b+1,e+1)&&f++,0==f||4==f)d+=3;for(b=0;b<c;b++)for(e=0;e<c-6;e++)a.isDark(b,e)&&!a.isDark(b,e+1)&&a.isDark(b,e+
2)&&a.isDark(b,e+3)&&a.isDark(b,e+4)&&!a.isDark(b,e+5)&&a.isDark(b,e+6)&&(d+=40);for(e=0;e<c;e++)for(b=0;b<c-6;b++)a.isDark(b,e)&&!a.isDark(b+1,e)&&a.isDark(b+2,e)&&a.isDark(b+3,e)&&a.isDark(b+4,e)&&!a.isDark(b+5,e)&&a.isDark(b+6,e)&&(d+=40);for(e=f=0;e<c;e++)for(b=0;b<c;b++)a.isDark(b,e)&&f++;a=Math.abs(100*f/c/c-50)/5;return d+10*a}},l={glog:function(a){if(1>a)throw Error("glog("+a+")");return l.LOG_TABLE[a]},gexp:function(a){for(;0>a;)a+=255;for(;256<=a;)a-=255;return l.EXP_TABLE[a]},EXP_TABLE:Array(256),
LOG_TABLE:Array(256)},m=0;8>m;m++)l.EXP_TABLE[m]=1<<m;for(m=8;256>m;m++)l.EXP_TABLE[m]=l.EXP_TABLE[m-4]^l.EXP_TABLE[m-5]^l.EXP_TABLE[m-6]^l.EXP_TABLE[m-8];for(m=0;255>m;m++)l.LOG_TABLE[l.EXP_TABLE[m]]=m;q.prototype={get:function(a){return this.num[a]},getLength:function(){return this.num.length},multiply:function(a){for(var c=Array(this.getLength()+a.getLength()-1),d=0;d<this.getLength();d++)for(var b=0;b<a.getLength();b++)c[d+b]^=l.gexp(l.glog(this.get(d))+l.glog(a.get(b)));return new q(c,0)},mod:function(a){if(0>
this.getLength()-a.getLength())return this;for(var c=l.glog(this.get(0))-l.glog(a.get(0)),d=Array(this.getLength()),b=0;b<this.getLength();b++)d[b]=this.get(b);for(b=0;b<a.getLength();b++)d[b]^=l.gexp(l.glog(a.get(b))+c);return(new q(d,0)).mod(a)}};p.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],
[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,
116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,
43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,
3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,
55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,
45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];p.getRSBlocks=function(a,c){var d=p.getRsBlockTable(a,c);if(void 0==d)throw Error("bad rs block @ typeNumber:"+a+"/errorCorrectLevel:"+c);for(var b=d.length/3,e=[],f=0;f<b;f++)for(var h=d[3*f+0],g=d[3*f+1],j=d[3*f+2],l=0;l<h;l++)e.push(new p(g,j));return e};p.getRsBlockTable=function(a,c){switch(c){case 1:return p.RS_BLOCK_TABLE[4*(a-1)+0];case 0:return p.RS_BLOCK_TABLE[4*(a-1)+1];case 3:return p.RS_BLOCK_TABLE[4*
(a-1)+2];case 2:return p.RS_BLOCK_TABLE[4*(a-1)+3]}};t.prototype={get:function(a){return 1==(this.buffer[Math.floor(a/8)]>>>7-a%8&1)},put:function(a,c){for(var d=0;d<c;d++)this.putBit(1==(a>>>c-d-1&1))},getLengthInBits:function(){return this.length},putBit:function(a){var c=Math.floor(this.length/8);this.buffer.length<=c&&this.buffer.push(0);a&&(this.buffer[c]|=128>>>this.length%8);this.length++}};"string"===typeof h&&(h={text:h});h=r.extend({},{render:"canvas",width:256,height:256,typeNumber:-1,
correctLevel:2,background:"#ffffff",foreground:"#000000"},h);return this.each(function(){var a;if("canvas"==h.render){a=new o(h.typeNumber,h.correctLevel);a.addData(h.text);a.make();var c=document.createElement("canvas");c.width=h.width;c.height=h.height;for(var d=c.getContext("2d"),b=h.width/a.getModuleCount(),e=h.height/a.getModuleCount(),f=0;f<a.getModuleCount();f++)for(var i=0;i<a.getModuleCount();i++){d.fillStyle=a.isDark(f,i)?h.foreground:h.background;var g=Math.ceil((i+1)*b)-Math.floor(i*b),
j=Math.ceil((f+1)*b)-Math.floor(f*b);d.fillRect(Math.round(i*b),Math.round(f*e),g,j)}}else{a=new o(h.typeNumber,h.correctLevel);a.addData(h.text);a.make();c=r("<table></table>").css("width",h.width+"px").css("height",h.height+"px").css("border","0px").css("border-collapse","collapse").css("background-color",h.background);d=h.width/a.getModuleCount();b=h.height/a.getModuleCount();for(e=0;e<a.getModuleCount();e++){f=r("<tr></tr>").css("height",b+"px").appendTo(c);for(i=0;i<a.getModuleCount();i++)r("<td></td>").css("width",
d+"px").css("background-color",a.isDark(e,i)?h.foreground:h.background).appendTo(f)}}a=c;jQuery(a).appendTo(this)})}})(jQuery);

/**
 * Copyright Marc J. Schmidt. See the LICENSE file at the top-level
 * directory of this distribution and at
 * https://github.com/marcj/css-element-queries/blob/master/LICENSE.
 */
"use strict";!function(e,t){"function"==typeof define&&define.amd?define(t):"object"==typeof exports?module.exports=t():e.ResizeSensor=t()}("undefined"!=typeof window?window:this,function(){function e(e,t){var i=Object.prototype.toString.call(e),n="[object Array]"===i||"[object NodeList]"===i||"[object HTMLCollection]"===i||"[object Object]"===i||"undefined"!=typeof jQuery&&e instanceof jQuery||"undefined"!=typeof Elements&&e instanceof Elements,o=0,s=e.length;if(n)for(;o<s;o++)t(e[o]);else t(e)}function t(e){if(!e.getBoundingClientRect)return{width:e.offsetWidth,height:e.offsetHeight};var t=e.getBoundingClientRect();return{width:Math.round(t.width),height:Math.round(t.height)}}if("undefined"==typeof window)return null;var i=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||function(e){return window.setTimeout(e,20)},n=function(o,s){function r(){var e=[];this.add=function(t){e.push(t)};var t,i;this.call=function(n){for(t=0,i=e.length;t<i;t++)e[t].call(this,n)},this.remove=function(n){var o=[];for(t=0,i=e.length;t<i;t++)e[t]!==n&&o.push(e[t]);e=o},this.length=function(){return e.length}}function d(e,n){if(e){if(e.resizedAttached)return void e.resizedAttached.add(n);e.resizedAttached=new r,e.resizedAttached.add(n),e.resizeSensor=document.createElement("div"),e.resizeSensor.dir="ltr",e.resizeSensor.className="resize-sensor";var o="position: absolute; left: -10px; top: -10px; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;",s="position: absolute; left: 0; top: 0; transition: 0s;";e.resizeSensor.style.cssText=o,e.resizeSensor.innerHTML='<div class="resize-sensor-expand" style="'+o+'"><div style="'+s+'"></div></div><div class="resize-sensor-shrink" style="'+o+'"><div style="'+s+' width: 200%; height: 200%"></div></div>',e.appendChild(e.resizeSensor);var d=window.getComputedStyle(e).getPropertyValue("position");"absolute"!==d&&"relative"!==d&&"fixed"!==d&&(e.style.position="relative");var c,h,l,f=e.resizeSensor.childNodes[0],u=f.childNodes[0],a=e.resizeSensor.childNodes[1],v=t(e),z=v.width,p=v.height,w=!0,g=function(){u.style.width="100000px",u.style.height="100000px",f.scrollLeft=1e5,f.scrollTop=1e5,a.scrollLeft=1e5,a.scrollTop=1e5},y=function(){if(w){if(!f.scrollTop&&!f.scrollLeft)return g(),void(l||(l=i(function(){l=0,y()})));w=!1}g()};e.resizeSensor.resetSensor=y;var S=function(){h=0,c&&(z=v.width,p=v.height,e.resizedAttached&&e.resizedAttached.call(v))},m=function(){v=t(e),c=v.width!==z||v.height!==p,c&&!h&&(h=i(S)),y()},b=function(e,t,i){e.attachEvent?e.attachEvent("on"+t,i):e.addEventListener(t,i)};b(f,"scroll",m),b(a,"scroll",m),i(y)}}var c;"undefined"!=typeof ResizeObserver?(c=new ResizeObserver(function(t){e(t,function(e){s.call(this,{width:e.contentRect.width,height:e.contentRect.height})})}),void 0!==o&&e(o,function(e){c.observe(e)})):e(o,function(e){d(e,s)}),this.detach=function(t){"undefined"!=typeof ResizeObserver?e(o,function(e){c.unobserve(e)}):n.detach(o,t)},this.reset=function(){o.resizeSensor.resetSensor()}};return n.reset=function(t,i){e(t,function(e){e.resizeSensor.resetSensor()})},n.detach=function(t,i){e(t,function(e){e&&(e.resizedAttached&&"function"==typeof i&&(e.resizedAttached.remove(i),e.resizedAttached.length())||e.resizeSensor&&(e.contains(e.resizeSensor)&&e.removeChild(e.resizeSensor),delete e.resizeSensor,delete e.resizedAttached))})},n});
