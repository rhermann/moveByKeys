/*
 * @author: Robert Hermann
 * @version: 0.7.1
 * @since: 28.05.2013
 *
 * Macht HTML-Element mit den Pfeiltasten der Tastatur verschiebbar,
 * Voraussetzung: die Elemente sind per position: absolute|relative über top und left beeinflussbar.
 * Features: Schrittweiten in X- und Y-Achse einstellbar
 * Begrenzung durch einen Elterncontainer (Angabe als jQuery Objekt), Verhalten der Grenzen als
 * Modi content (Innen), padding (Innen + Innenabstand), border (einschließlich border).
 * TODO: Zahlenwerte als Begrenzung direkt setzbar
 * TODO: Logarithmische Beschleunigung nach gewisser Zeit von step 1 zu maxWert einstellbar
 */
$.fn.moveByKeys = function (options) {

    var $elements = this;

    /*
     * Beispiel-CSS Rahmen: div {width:100px; padding: 25px; border: 10px;}
     * "border" Inhalt + padding + border mit ein als Begrenzung (170px) (vgl. outerWidth, outerHeight)
     * "padding" Inhalt + padding (150px) (vgl. innerWidth, innerHeight)
     * "content" Inhalt - padding - border (100px) (vgl. width, height)
     */
    var CONTAINMENT_MODES = {
        content: 'content',
        padding: 'padding',
        border: 'border'
    };

    $elements.each(function () {
        var self = this,
            $self = $(this);

        var moveByKeys = {

            PLUGIN_NS: 'moveByKeys',
            arrEventhandler: [],
            EVENTS: {
                KEYDOWN: 'keydown'
            },

            init: function (options) {

                var me = this;
                /*
                 * Kommandos: destroy
                 */
                if (typeof options === 'string') {
                    switch (options) {
                        case 'destroy':
                            me.destroy();
                            return $elements; //Fluent Interface, Verkettung ermöglichen
                            break;
                    }
                } else {

                    /*
                     * Initialisierung des Plugins
                     */
                    var defaults = {
                        step: 1, //Schrittgröße in Pixeln für beide Achsen x/y
                        stepX: 1, //Schrittweite left/right x-Achse
                        stepY: 1, //Schrittweite up/down y-Achse
                        containment: null, //Container der Grenzen vorgibt
                        containmentMode: CONTAINMENT_MODES.border, //wie weit reicht die Außenhülle - siehe Box-Model ohne margin
                        preventScrolling: true //Verhindert das bei Pfeilbewegung die Webseite mitgescrollt wird
                    };
                    //ist step gesetzt werden beide Schrittweiten überschrieben
                    if (typeof options === 'object' && typeof options.step !== 'undefined') {
                        defaults.stepX = options.step;
                        defaults.stepY = options.step;
                    }
                    options = $.extend(defaults, options);
//                    console.log(options);

                    /*
                     * Tastenereignisse auswerten
                     */
                    var keydownFn = function (event) {

                        var arrAllowedKeyCodes = [37, 38, 39, 40];
                        //ab IE9 Array.indexOf verfügbar (siehe: http://kangax.github.io/es5-compat-table/)
                        if (Array.prototype.indexOf) {
                            if (arrAllowedKeyCodes.indexOf(event.keyCode) === -1) {
                                //Keine Pfeiltaste dann abbrechen
                                return;
                            }
                        } else {
                            //<= IE8
                            var i, l = arrAllowedKeyCodes.length, boolFound = false;
                            for (i = 0; i < l; i += 1) {
                                if (arrAllowedKeyCodes[i] == event.keyCode) {
                                    boolFound = true;
                                    break;
                                }
                            }
                            if (!boolFound) {
                                return;
                            }
                        }

                        //Verhindert Scrollen der Seite, wenn die Box bewegt wird
                        if (options.preventScrolling) {
                            event.preventDefault();
                        }

                        //Absolute Position des HTML-Elements ermitteln
                        //Es gilt die border als Außenhülle der Box, die im Container andockt, kein Modus vorgesehen
                        var selfOffset = $self.offset(),
                            boxDimensions = {
                                x1: selfOffset.left,
                                x2: selfOffset.left + $self.outerWidth(),
                                y1: selfOffset.top,
                                y2: selfOffset.top + $self.outerHeight()
                            };

                        var $container = false,
                            containerDimensions = {
                                x1: 0, x2: 0,
                                y1: 0, y2: 0
                            };
                        if ($(options.containment).length > 0) {
                            $container = $(options.containment).eq(0);
                            var offset = $container.offset(), w, h, x, y;

                            switch (options.containmentMode) {
                                case (CONTAINMENT_MODES.border):
                                    w = $container.outerWidth();
                                    h = $container.outerHeight();
                                    x = offset.left;
                                    y = offset.top;
                                    break;
                                case (CONTAINMENT_MODES.padding):
                                    w = $container.innerWidth();
                                    h = $container.innerHeight();
                                    //Offset gibt den äußersten Punkt, daher muss border hinzugefügt werden davon, wegen 2 Seiten durch 2 teilen
                                    x = offset.left + (($container.outerWidth() - $container.innerWidth()) / 2);
                                    y = offset.top + (($container.outerHeight() - $container.innerHeight()) / 2);
                                    break;
                                case (CONTAINMENT_MODES.content):
                                    w = $container.width();
                                    h = $container.height();
                                    //Offset gibt den äußersten Punkt, daher muss border + padding hinzugefügt werden davon, wegen 2 Seiten durch 2 teilen
                                    x = offset.left + (($container.outerWidth() - $container.width()) / 2);
                                    y = offset.top + (($container.outerHeight() - $container.height()) / 2);
                                    break;
                            }

                            //Gleicher Koordinatenursprung mit offset, css('left/top') sind nicht zuverlässig da relative Positionen
                            containerDimensions.x1 = x;
                            containerDimensions.x2 = x + w;
                            containerDimensions.y1 = y;
                            containerDimensions.y2 = y + h;
                        }

                        var resultX, resultY;

                        //Quelle: http://stackoverflow.com/questions/4950575/how-to-move-a-div-with-arrow-keys
                        switch (event.keyCode) {
                            case 37: //left
                                resultX = boxDimensions.x1 - options.stepX;
                                if ($container) {
                                    //check x1
                                    //x1 Rahmen nicht überschreiten durch zu hohe Schrittweite, angleichen an Außenhülle
                                    if (resultX < containerDimensions.x1) {
                                        resultX = containerDimensions.x1;
                                    }
                                }
                                $self.offset({left: resultX, top: boxDimensions.y1});
                                break;
                            case 38: //up
                                resultY = boxDimensions.y1 - options.stepY;
                                if ($container) {
                                    //check y1
                                    if (resultY < containerDimensions.y1) {
                                        resultY = containerDimensions.y1;
                                    }
                                }
                                $self.offset({left: boxDimensions.x1, top: resultY});
                                break;
                            case 39: //right
                                resultX = boxDimensions.x1 + options.stepX;
                                if ($container) {
                                    //check x2
                                    //Schrittweite ist größer als Abstand zu x2, dann zu x2 aufschließen
                                    if (Math.abs(containerDimensions.x2 - boxDimensions.x2) < options.stepX) {
                                        resultX = boxDimensions.x1 + Math.abs(containerDimensions.x2 - boxDimensions.x2);
                                    }
                                }
                                $self.offset({left: resultX, top: boxDimensions.y1});
                                break;
                            case 40: //down
                                //check y2
                                resultY = boxDimensions.y1 + options.stepY;
                                if ($container) {
                                    //Schrittweite ist größer als Abstand zu y2, dann zu y2 aufschließen
                                    if (Math.abs(containerDimensions.y2 - boxDimensions.y2) < options.stepY) {
                                        resultY = boxDimensions.y1 + Math.abs(containerDimensions.y2 - boxDimensions.y2);
                                    }
                                }
                                $self.offset({left: boxDimensions.x1, top: resultY});
                                break;
                        }
                    };

                    /*
                     * Tasten ermitteln
                     */
                    $(document).on(me.EVENTS.KEYDOWN, keydownFn);
                    //Eventhandler einsammeln, um sie bei "destroy" abbinden zu können
                    me.arrEventhandler.push(keydownFn);

                    //Plugin an HTML-Element hängen
                    $(self).data(me.PLUGIN_NS, me);

                }

            },
            /**
             * Eventlistener bzw. -handler entfernen, anhand der im Plugin
             * gespeicherten Funktionen
             */
            removeEventhandler: function () {
                var me = this,
                    len = me.arrEventhandler.length,
                    i;
                for (i = 0; i < len; i += 1) {
                    $(document).off(me.EVENTS.KEYDOWN, me.arrEventhandler[i]);
                }
            },
            /**
             * Zerstört das am Objekt gebundene Plugin "moveByKeys",
             * entfernt die Eventlistener und entkoppelt das Plugin vom HTML-Element.
             */
            destroy: function () {
                //destroy at data attached plugin
                var me = this,
                    attachedPlugin = $(self).data(me.PLUGIN_NS);

                if (typeof attachedPlugin === 'object' &&
                    typeof attachedPlugin.PLUGIN_NS !== 'undefined' &&
                    attachedPlugin.PLUGIN_NS == me.PLUGIN_NS) {
                    //remove event listeners
                    attachedPlugin.removeEventhandler();

                    //detach data
                    $(self).removeData(me.PLUGIN_NS);
                }

            }
        };

        //Startpunkt
        moveByKeys.init(options);

    });

    return $elements; //Fluent Interface, Verkettung ermöglichen

};
