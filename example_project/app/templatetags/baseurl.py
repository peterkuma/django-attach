import re
from BeautifulSoup import BeautifulSoup
from django import template


register = template.Library()

@register.filter
def baseurl(html, base):
    if not base.endswith('/'):
        base += '/'

    absurl = re.compile(r'\s*[a-zA-Z][a-zA-Z0-9\+\.\-]*:')  # Starts with scheme:.
    def isabs(url):
        return url.startswith('/') or absurl.match(url)

    soup = BeautifulSoup(html)

    for link in soup.findAll('a', href=True):
        if not isabs(link['href']):
            link['href'] = base + link['href']

    for img in soup.findAll('img', src=True):
        if not isabs(img['src']):
            img['src'] = base + img['src']

    elements = soup.findAll(style=True) # All styled elements.
    for e in elements:
        def func(m):
            url = m.group(2)
            if not isabs(url):
                url = base + url
            return m.group(1) + url + m.group(3)

        e['style'] = re.sub(r'''(url\(\s*)([^\s\)\"\']*)(\s*\))''', func, e['style'])
        e['style'] = re.sub(r'''(url\(\s*")([^\s\"]*)("\s*\))''', func, e['style'])
        e['style'] = re.sub(r'''(url\(\s*')([^\s\']*)('\s*\))''', func, e['style'])

    return unicode(soup)
baseurl.is_safe = True
