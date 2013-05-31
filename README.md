moveByKeys
==========

Move HTML elements by keyboard arrow keys, with different constraints modi.

Usage:
Steps 1px on x- or y axis, no borders

    $('#box').moveByKeys();

Destroy/Deactivate Plugin-Eventhandler

    $('#box').moveByKeys('destroy');

Default options:

    step: 1, //step size for x- or y-axis
    stepX: 1, //step size left/right x-axix
    stepY: 1, //step size up/down y-axis
    containment: null, //$('#parent'), container stops box - 1 element if collection it takes the first element
    containmentMode: CONTAINMENT_MODES.border, //border = box goes till border, padding = box goes till padding, content = box moves inside
    preventScrolling: true //prevent scrolling website/document

Examples:

        $('.box').moveByKeys({
            containment: $('#surround'),
            containmentMode: 'content',
            stepY: 14,
            stepX: 24
        });

http://jsfiddle.net/c3k3N/2/