/**
 * @author Script47 (https://github.com/Script47/Toast)
 * @description Toast - A Bootstrap 4.2+ jQuery plugin for the toast component
 * @version 0.7.1
 **/
(function ($) {
    var TOAST_CONTAINER_HTML = '<div id="toast-container" aria-live="polite" aria-atomic="true"></div>';
    var TOAST_WRAPPER_HTML = '<div id="toast-wrapper"></div>';

    $.toast = function (opts) {
        if (!$('#toast-container').length) {
            $('body').prepend(TOAST_CONTAINER_HTML);
            $('#toast-container').append(TOAST_WRAPPER_HTML);

            $('body').on('hidden.bs.toast', '.toast', function () {
                $(this).remove();
            });
        }

        var id = 'toast-' + ($('.toast').length + 1),
            html = '',
            bg_header_class = '',
            fg_header_class = '',
            fg_subtitle_class = 'text-muted',
            fg_dismiss_class = '',
            title = opts.title || 'Notice!',
            subtitle = opts.subtitle || '',
            content = opts.content || '',
            type = opts.type || 'info',
            delay = opts.delay || -1,
            img = opts.img,
            pause_on_hover = opts.pause_on_hover || false,
            pause = false,
            delay_or_autohide = '';

        switch (type) {
            case 'info':
                bg_header_class = 'bg-info';
                fg_header_class = 'text-white';
                fg_subtitle_class = 'text-white';
                fg_dismiss_class = 'text-white';
                break;

            case 'success':
                bg_header_class = 'bg-success';
                fg_header_class = 'text-white';
                fg_subtitle_class = 'text-white';
                fg_dismiss_class = 'text-white';
                break;

            case 'warning':
            case 'warn':
                bg_header_class = 'bg-warning';
                fg_header_class = 'text-white';
                fg_subtitle_class = 'text-white';
                fg_dismiss_class = 'text-white';
                break;

            case 'error':
            case 'danger':
                bg_header_class = 'bg-danger';
                fg_header_class = 'text-white';
                fg_subtitle_class = 'text-white';
                fg_dismiss_class = 'text-white';
                break;
        }

        if (pause_on_hover !== false) {
            var hide_timestamp = Math.floor(Date.now() / 1000) + (delay / 1000);

            delay_or_autohide = 'data-autohide="false"';
            pause_on_hover = 'data-hide-timestamp="' + hide_timestamp + '"';
        } else {
            if (delay === -1) {
                delay_or_autohide = 'data-autohide="false"';
            } else {
                delay_or_autohide = 'data-delay="' + delay + '"';
            }
        }

        html = '<div id="' + id + '" class="toast" role="alert" aria-live="assertive" aria-atomic="true" ' + delay_or_autohide + ' ' + pause_on_hover + '>';
        html += '<div class="toast-header ' + bg_header_class + ' ' + fg_header_class + '">';

        if (typeof img !== 'undefined') {
            html += '<img src="' + img.src + '" class="' + (img.class || '') + ' mr-2" alt="' + (img.alt || 'Image') + '" ' + (typeof img.title !== 'undefined' ? 'data-toggle="tooltip" title="' + img.title + '"' : '') + '>';
        }

        html += '<strong class="mr-auto">' + title + '</strong>';
        html += '<small class="' + fg_subtitle_class + '">' + subtitle + '</small>';
        html += '<button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">';
        html += '<span aria-hidden="true" class="' + fg_dismiss_class + '">&times;</span>';
        html += '</button>';
        html += '</div>';

        if (content !== '') {
            html += '<div class="toast-body">'
            html += content
            html += '</div>';
        }

        html += '</div>';

        $('#toast-wrapper').append(html);
        $('#toast-wrapper .toast:last').toast('show');

        if (pause_on_hover !== false) {
            setTimeout(function () {
                if (!pause) {
                    $('#' + id).toast('hide');
                }
            }, delay);

            $(document).on('mouseover', '#' + id, function () {
                pause = true;
            });

            $(document).on('mouseleave', '#' + id, function () {
                var current = Math.floor(Date.now() / 1000),
                    future = parseInt($(this).data('hide-timestamp'));

                pause = false;

                if (current >= future) {
                    $(this).toast('hide');
                }
            });
        }
    }
}(jQuery));