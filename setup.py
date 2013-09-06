import os
from setuptools import setup

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

setup(
    name='django-attach',
    version='0.1.1',
    packages=['django_attach'],
    include_package_data=True,
    license='BSD License',
    description='Django admin plugin for attaching files to model instances with multiple file selection support',
    url='https://github.com/peterkuma/django-attach/',
    author='Peter Kuma',
    author_email='peterkuma@waveland.org',
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
    ],
    package_data={
        'django_attach': [
            'django_attach/static/*',
            'django_attach/templates/*',
        ]
    }
)
