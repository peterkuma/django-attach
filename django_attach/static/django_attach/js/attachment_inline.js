function AttachmentInline(el, prefix) {
    var module = {};
    var data = [];
    var dirty = false;
    var orig_el = null;
    var form = null;
    var content_type = null;
    var object_id = null;

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

    function update() {
        el.select('#id_'+prefix+'-CONTENT_TYPE')
            .attr('value', content_type !== null ? content_type : '');
        el.select('#id_'+prefix+'-OBJECT_ID')
            .attr('value', object_id !== null ? object_id : '');
        el.select('#id_'+prefix+'-INITIAL_FORMS')
            .attr('value', data.filter(function(d) { return d.id >= 0; }).length);
        el.select('#id_'+prefix+'-TOTAL_FORMS')
            .attr('value', data.length);

        var attachment = el.select('.list').selectAll('.attachment')
            .data(data, function(d) { return d.name; })
            .attr('class', 'attachment');

        var new_attachment = attachment.enter()
            .append('div')
            .attr('class', 'attachment');

        new_attachment.append('input')
            .attr('class', 'id')
            .attr('id', function(d) { return 'id_'+d.name+'-id'; })
            .attr('name', function(d) { return d.name+'-id'; })
            .attr('type', 'hidden');

        new_attachment.append('input')
            .attr('id', function(d) { return 'id_'+d.name+'-file'; })
            .attr('name', function(d) { return d.name+'-file'; })
            .attr('type', 'file')
            .style('display', 'none');

        new_attachment.append('a')
            .text(function(d) { return d.filename; })
            .attr('href', function(d) {
                if (d.file) return window.URL.createObjectURL(d.file);
                return d.url;
            });

        new_attachment.append('div')
            .attr('class', 'delete')
            .on('click', function(d) {
                if (d.file) data.splice(data.indexOf(d), 1);
                else d.remove = true;
                update();
            });

        attachment
            .style('display', function(d) { return d.remove ? 'none' : 'block'; });

        attachment.select('.id')
            .attr('value', function(d) { return d.id >= 0 ? d.id : ''; });

        attachment.exit().remove();

        var input_delete = el.selectAll('input.delete')
            .data(data.filter(function(d) { return d.remove; }),
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
        form_data.append('file', attachment.file);

        var req = new XMLHttpRequest();
        req.open('POST',  '../../../django_attach/attachment/add/');
        req.upload.onprogress = onprogress;
        req.setRequestHeader('Accept', 'application/json');
        req.setRequestHeader('X-CSRFToken', form.elements['csrfmiddlewaretoken'].value);
        req.onloadend = function() {
            var uri;
            var json = null;
            var json_error = null;
            try { json = JSON.parse(req.response); }
            catch (e) { json_error = e; }
            if (req.status !== 200) {
                uri = datauri(req.responseText);
                callback('Request failed: '+
                         'HTTP '+req.status+' '+req.statusText+' '+
                         '(<a href="'+uri+'">details</a>)');
                return;
            }
            if (json === null) {
                uri = datauri(req.responseText);
                callback('Invalid response: '+json_error+' '+
                         '(<a href="'+uri+'">details</a>)');
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

    function submit(button) {
        var size = 0;
        var loaded = 0;
        var loaded_last = 0;

        if (!dirty) {
            button.on('click', null);
            button.node().click();
            return;
        }

        data.forEach(function(d) {
            if (!d.file) return;
            size += d.file.size;
        });

        var onprogress = function(evt) {
            loaded += evt.loaded - loaded_last;
            loaded_last = evt.loaded;
            var percent = Math.round(100.0*loaded/size);
            note('Uploading... '+percent+'%');
        };

        var q = queue(1);
        data.forEach(function(d) {
            if (!d.file) return;
            q.defer(submit_attachment, d, onprogress);
        });

        note('Uploading... 0%');
        q.awaitAll(function(err, results) {
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

    function available_name(name) {
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
        dirty = true;
        data.push({
            'name': prefix+'-'+data.length,
            'file': file,
            'filename': available_name(file.name)
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
