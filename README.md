# quiz.js

The _quiz.js_ was developed as extension for
[elearn.js](https://github.com/elb-min-uhh/elearn.js). But it is also
possible to use _quiz.js_ on its own. You need to include _jQuery_ for _quiz.js_
to work.

## Documentation

The detailled documentation is currently only available in _german_.
You can see it on https://elb-min-uhh.github.io/quiz.js/.

## Usage

If you want to include _quiz.js_ into your page, you can do it on multiple ways.

### With elearn.js

With _elearn.js_ it's easiest to use the
[atom-elearnjs](https://github.com/elb-min-uhh/atom-elearnjs) package for
the editor _Atom_. You can simply add the _question divs_ to the markdown
file and the package will do the _quiz.js_ import for you.

The file [quizJS_Dokumentation.md](/quizJS_Dokumentation.md) is written for
the _atom-elearnjs_ package. It will convert to the linked
[documentation](#documentation) (with a few minor differences).

### Manually

If you want to add it manually to your HTML file, you have to insert

    <link rel="stylesheet" type="text/css" href="assets/css/quiz.css">
    <script type="text/javascript" src="assets/js/min.js"></script> <!-- jQuery -->
    <script type="text/javascript" src="assets/js/quiz.js"></script> <!-- Quiz Script -->

to the `<head>`. You can then use the quiz elements everywhere in the `<body>`.

__Notice:__ You can find those files in the _assets_ folder. You might want
to update the _href_/_src_ path when you manually copy the files.

## Language Selection

Per default all _quiz.js_ elements will be german. You can change this easily
with different methods.

1. A `lang` attribute will cause this node and all included _quiz.js_ nodes to
appear in the selected language. E.g. `<html lang="en">` to change the language
for the whole document or `<div class="question" lang="en">` for only one
question.
2. The `quizJS.setLanguage()` function can be used to set the language from
inside a script. You can use this for _atom-elearnjs_ projects in the
_meta custom_ block.

Available languages are:
* _de_: German (default)
* _en_: English


## Quiz Elements

There are quiz elements of several types. Please check the the
[documentation](#documentation).

One simple example code for a multiple choice question is

    <div class="question" qtype="choice" id="q_choice">
        <h4>What directories are likely to be present in a digital script?</h4>

        <div class="answers multiple">
            <label><input val="Frage2-1">assets</label>
            <label><input val="Frage2-2">movies</label>
            <label><input val="Frage2-3">img</label>
            <label><input val="Frage2-4">css</label>
            <label><input val="Frage2-5">lang</label>
        </div>

        <div class="feedback correct">
            You were correct.
        </div>
        <div class="feedback incorrect">
            You were wrong.
        </div>

        <!--
        MD5 of the correct input id's
        -->
        <a class="ans">b5ceb729a1b347aa357790e1588c88b3</a>
        <a class="ans">1fd302a9c89fc92eead418857a7e5a07</a>
        <a class="ans">4fc364339b2127eb81c13ab986a27085</a>
    </div>


## License

_quiz.js_ is developed by
[dl.min](https://www.min.uni-hamburg.de/studium/digitalisierung-lehre/ueber-uns.html)
of Universität Hamburg.

The software is using [MIT-License](http://opensource.org/licenses/mit-license.php).

cc-by Michael Heinecke, Arne Westphal, dl.min, Universität Hamburg
