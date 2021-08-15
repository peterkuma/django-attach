function AttachmentInline(el, prefix, admin_prefix) {
    var module = {};
    var data = [];
    var orig_el = null;
    var form = null;
    var content_type = null;
    var object_id = null;
    var busy = false;

    init();

    function init() {
        if (!browser_supported()) {
            console.log('AttachmentInline: Browser not supported');
            return;
        }

        if (typeof(el) === 'string') el = d3.select(el);

        data = parse_initial();

        /* Hack: get the parent form. */
        form = el.select('input').node().form;

        /* Get content_type and object_id from management form. */
        content_type = parseInt(el.select('#id_'+prefix+'-CONTENT_TYPE').attr('value'), 10);
        object_id = parseInt(el.select('#id_'+prefix+'-OBJECT_ID').attr('value'), 10);
        if (isNaN(content_type)) content_type = null;
        if (isNaN(object_id)) object_id = null;

        orig_el = el;
        el = d3.select(orig_el.node().parentNode).insert('div')
            .attr('id', orig_el.attr('id'))
            .attr('class', orig_el.attr('class')+' attachment-inline');
        orig_el.remove();

        el.append('h2')
            .text(orig_el.select('h2').text());

        el.append('div')
            .attr('class', 'error')
            .style('display', 'none');

        el.append('div')
            .attr('class', 'note')
            .style('display', 'none');

        el.append('input')
            .attr('type', 'hidden')
            .attr('id', 'id_'+prefix+'-CONTENT_TYPE')
            .attr('name', prefix+'-CONTENT_TYPE')
            .attr('value', content_type);
        el.append('input')
            .attr('type', 'hidden')
            .attr('id', 'id_'+prefix+'-OBJECT_ID')
            .attr('name', prefix+'-OBJECT_ID')
            .attr('value', object_id);
        el.append('input')
            .attr('type', 'hidden')
            .attr('id', 'id_'+prefix+'-TOTAL_FORMS')
            .attr('name', prefix+'-TOTAL_FORMS')
            .attr('value', data.length);
        el.append('input')
            .attr('type', 'hidden')
            .attr('id', 'id_'+prefix+'-INITIAL_FORMS')
            .attr('name', prefix+'-INITIAL_FORMS')
            .attr('value', data.length);
        el.append('input')
            .attr('type', 'hidden')
            .attr('id', 'id_'+prefix+'-MAX_NUM_FORMS')
            .attr('name', prefix+'-MAX_NUM_FORMS')
            .attr('value', 1000);

        el.append('div').attr('class', 'list');

        var button = el.append('input')
            .attr('type', 'submit')
            .attr('class', 'attach')
            .attr('value', 'Attach file')
            .on('click', function() {
                d3.event.preventDefault();
                module.attach();
            });

        document.addEventListener('DOMContentLoaded', function() {
            d3.select(form).selectAll('.submit-row > input[type="submit"]')
                .on('click', function() {
                    d3.event.preventDefault();
                    submit(d3.select(this));
                });
        });

        update();
    }

    function browser_supported() {
        return window.XMLHttpRequest !== undefined &&
               window.FormData !== undefined;
    }

    function parse_initial() {
        var attachments = el.selectAll('input[type="file"]')
            .filter(function() {
                return this.parentNode.querySelector('a');
            })
            [0].map(function(node) {
                var name = node.name.substring(0, node.name.lastIndexOf('-'));
                var url = d3.select(node.parentNode).select('a').attr('href');
                var filename =  url.substring(url.lastIndexOf('/')+1);
                var d = {
                    'name': name,
                    'id': el.select('#id_'+name+'-id').attr('value'),
                    'url': url,
                    'filename': filename
                };
                if (el.select('#id_'+name+'-DELETE').node().checked)
                    d.remove = true;
                return d;
            });
        return attachments;
    }

    function error(msg) {
        if (!arguments.length) return this.msg;
        this.msg = msg;
        if (note() !== null) note(null);
        el.select('.error')
            .style('display', msg !== null ? 'block' : 'none')
            .html(msg);
    }
    error.msg = null;

    function note(msg) {
        if (!arguments.length) return this.msg;
        this.msg = msg;
        if (error() !== null) error(null);
        el.select('.note')
            .style('display', msg !== null ? 'block' : 'none')
            .html(msg);
    }
    note.msg = null;

    function renumber() {
        var i = 0;
        data.forEach(function(d) {
            if (d.is_new) {
                if (d.remove) {
                    d.name = '';
                } else {
                    d.name = prefix + '-' + i;
                    i++;
                }
            } else {
                i++;
            }
        });
    }

    function update() {
        renumber();

        el.select('#id_'+prefix+'-CONTENT_TYPE')
            .attr('value', content_type !== null ? content_type : '');
        el.select('#id_'+prefix+'-OBJECT_ID')
            .attr('value', object_id !== null ? object_id : '');
        el.select('#id_'+prefix+'-INITIAL_FORMS')
            .attr('value', data.filter(function(d) { return d.id >= 0; }).length);
        el.select('#id_'+prefix+'-TOTAL_FORMS')
            .attr('value', data.length);

        var attachment = el.select('.list').selectAll('.attachment')
            .data(data, function(d) { return d.name; });

        var new_attachment = attachment.enter().append('div');

        new_attachment
            .attr('class', 'attachment')
            .classed('new', function(d) { return d.is_new; });

        new_attachment.append('input')
            .attr('class', 'id')
            .attr('type', 'hidden');

        new_attachment.append('input')
            .attr('type', 'file')
            .style('display', 'none');

        new_attachment.append('a')
            .attr('href', function(d) {
                if (d.file) return window.URL.createObjectURL(d.file);
                return d.url;
            });

        new_attachment.append('input')
            .attr('type', 'text')
            .attr('value', function(d) { return d.filename; });

        new_attachment.append('div')
            .attr('class', 'attachment-button rename')
            .attr('title', 'Rename')
            .on('click', function(d) {
                d.rename = true;
                update();
            });

        new_attachment.append('div')
            .attr('class', 'attachment-button confirm-rename')
            .attr('title', 'Confirm rename')
            .on('click', function(d) {
                var input = this.parentNode.querySelector('input[type="text"]');
                valid_name = get_valid_name(input.value);
                if (valid_name !== d.filename) {
                    d.filename = get_available_name(valid_name);
                }
                input.value = d.filename;
                d.rename = false;
                update();
            });

        new_attachment.append('div')
            .attr('class', 'attachment-button cancel-rename')
            .attr('title', 'Cancel rename')
            .on('click', function(d) {
                var input = this.parentNode.querySelector('input[type="text"]');
                d.rename = false;
                input.value = d.filename;
                update();
            });

        new_attachment.append('div')
            .attr('class', 'attachment-button delete')
            .attr('title', 'Remove')
            .on('click', function(d) {
                d.rename = false;
                d.remove = true;
                update();
            });

        new_attachment.append('div')
            .attr('class', 'attachment-button revert')
            .attr('title', 'Revert')
            .on('click', function(d) {
                d.rename = false;
                d.remove = false;
                update();
            });

        attachment
            .classed('remove', function(d) { return d.remove; })
            .classed('rename', function(d) { return d.rename; });

        attachment.select('.id')
            .attr('value', function(d) { return d.id >= 0 ? d.id : ''; });

        attachment.select('a')
            .text(function(d) { return d.filename; });

        attachment.select('input[type="hidden"]')
            .attr('id', function(d) {
                return d.name !== '' ? 'id_'+d.name+'-id' : '';
            })
            .attr('name', function(d) {
                return d.name !== '' ? d.name+'-id' : '';
            });

        attachment.select('input[type="file"]')
            .attr('id', function(d) {
                return d.name !== '' ? 'id_'+d.name+'-file' : '';
            })
            .attr('name', function(d) {
                return d.name !== '' ? d.name+'-file' : '';
            });

        attachment.select('input[type="text"]')
            .attr('id', function(d) {
                return d.name !== '' ? 'id_'+d.name+'-filename' : '';
            })
            .attr('name', function(d) {
                return d.name !== '' ? d.name+'-filename' : '';
            });

        attachment.exit().remove();

        var input_delete = el.selectAll('input.delete')
            .data(data.filter(function(d) { return d.remove && !d.is_new; }),
                  function(d) { return d.name; });

        input_delete.enter().append('input')
            .attr('type', 'hidden')
            .attr('class', 'delete')
            .attr('name', function(d) { return d.name+'-DELETE'; })
            .attr('value', 'on');

        input_delete.exit().remove();
    }

    function datauri(data) {
        return 'data:text/html;base64,'+window.btoa(data);
    }

    function submit_attachment(attachment, onprogress, callback) {
        if (attachment.id >= 0 || attachment.remove || !attachment.file) {
            // Nothing to do.
            return;
        }

        var form_data = new FormData();
        if (content_type !== null && object_id !== null) {
            form_data.append('content_type', content_type);
            form_data.append('object_id', object_id);
        }
        file = new File([attachment.file], attachment.filename);
        form_data.append('file', file);

        var req = new XMLHttpRequest();
        req.open('POST',  admin_prefix + 'django_attach/attachment/add/');
        req.upload.onprogress = onprogress;
        req.setRequestHeader('Accept', 'application/json');
        req.setRequestHeader('X-CSRFToken', form.elements['csrfmiddlewaretoken'].value);
        req.onloadend = function() {
            var uri;
            var json = null;
            var json_error = null;
            try { json = JSON.parse(req.response); }
            catch (e) { json_error = e; }
            if (req.status !== 200 || json === null) {
                console.error(req.responseText);
                callback('Upload request failed');
                return;
            }
            content_type = json.content_type;
            object_id = json.object_id;

            callback(null, {
                'attachment': attachment,
                'response': json
            });
        };
        req.send(form_data);
    }

    function is_dirty() {
        return data.some(function(d) {
            return d.is_new && !d.remove;
        });
    }

    function submit(button) {
        var size = 0;
        var loaded = 0;

        if (!is_dirty()) {
            button.on('click', null);
            button.node().click();
            return;
        }

        data.forEach(function(d) {
            if (!d.file || d.remove) return;
            size += d.file.size;
        });

        if (busy) {
            return;
        }
        busy = true;

        var q = queue(1);
        data.forEach(function(d) {
            if (!d.file || d.remove) return;

            var loaded_last = 0;
            var onprogress = function(evt) {
                loaded += evt.loaded - loaded_last;
                loaded_last = evt.loaded;
                var percent = Math.min(100.0, Math.round(100.0*loaded/size));
                note('Uploading... '+percent+'%');
            };

            q.defer(submit_attachment, d, onprogress);
        });

        note('Uploading... 0%');
        q.awaitAll(function(err, results) {
            busy = false;
            if (err) {
                error(err);
                return;
            }
            note('Uploading... 100%');
            results.forEach(function(res) {
                res.attachment.id = res.response.id;
                delete res.attachment.file;
            });
            update();
            button.on('click', null);
            button.node().click();
        });
    }

    function get_valid_name(name) {
        s = name.trim().replace(' ', '_');
        s = s.replace(/[^-\w.]/g, '');
        if (s === '' || s === '.')
            s = '_';
        if (s === '..')
            s = '__';
        return s;
    }

    function get_available_name(name) {
        var names = data.map(function(d) { return d.filename; });
        var n = name.lastIndexOf('.');
        var base = n >= 0 ? name.substring(0, n) : name;
        var suffix = n >= 0 ? name.substring(n) : '';
        var i = 1;
        while (names.indexOf(name) >= 0) {
            name = base+'_'+i+suffix;
            i++;
        }
        return name;
    }

    function attach_file(file) {
        data.push({
            'file': file,
            'filename': get_available_name(get_valid_name(file.name)),
            'is_new': true,
        });
        update();
    }

    module.attach = function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = function() {
            [].forEach.call(input.files, function(file) {
                attach_file(file);
            });
        };
        input.click();
        return module;
    };

    return module;
}
