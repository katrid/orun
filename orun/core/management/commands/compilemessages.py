import codecs
import glob
import os

from orun.apps import apps
from orun.core.management import commands
from orun.core.management.base import CommandError
from orun.core.management.utils import find_command, popen_wrapper


def has_bom(fn):
    with open(fn, 'rb') as f:
        sample = f.read(4)
    return (sample[:3] == b'\xef\xbb\xbf' or
        sample.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)))


def is_writable(path):
    # Known side effect: updating file access/modified time to current time if
    # it is writable.
    try:
        with open(path, 'a'):
            os.utime(path, None)
    except (IOError, OSError):
        return False
    return True


@commands.command('compilemessages', short_help='Compiles .po files to .mo files for use with builtin gettext support.')
@commands.option(
    '--locale', '-l',
    default=[],
    help='Locale(s) to process (e.g. de_AT). Default is to process all.',
)
@commands.option(
    '--exclude', '-x',
    default=[],
    help='Locales to exclude. Default is none. Can be used multiple times.',
)
@commands.option(
    '--use-fuzzy', '-f',
    default=[],
    help='Use fuzzy translations.',
)
def command(**kwargs):
    cmd = Command()
    cmd.handle(**kwargs)


class Command(object):
    requires_system_checks = False
    leave_locale_alone = True

    program = 'msgfmt'
    program_options = ['--check-format']

    def handle(self, **options):
        locale = options.get('locale')
        exclude = options.get('exclude')
        self.verbosity = int(options.get('verbosity'))
        if options.get('fuzzy'):
            self.program_options = self.program_options + ['-f']

        if find_command(self.program) is None:
            raise CommandError("Can't find %s. Make sure you have GNU gettext "
                               "tools 0.15 or newer installed." % self.program)

        basedirs = [os.path.join('conf', 'locale'), 'locale']
        if os.environ.get('ORUN_ADDON_PATH'):
            from orun.conf import settings
            basedirs.extend(path for path in settings.LOCALE_PATHS)

        # Walk entire tree, looking for locale directories
        for dirpath, dirnames, filenames in os.walk('.', topdown=True):
            for dirname in dirnames:
                if dirname == 'locale':
                    basedirs.append(os.path.join(dirpath, dirname))

        # Gather existing directories.
        basedirs = set(map(os.path.abspath, filter(os.path.isdir, basedirs)))

        if not basedirs:
            raise CommandError("This script should be run from the Orun Git "
                               "checkout or your project or app tree, or with "
                               "the settings module specified.")

        # Build locale list
        all_locales = []
        for basedir in basedirs:
            locale_dirs = filter(os.path.isdir, glob.glob('%s/*' % basedir))
            all_locales.extend(map(os.path.basename, locale_dirs))

        # Account for excluded locales
        locales = (locale,) or all_locales
        locales = set(locales) - set(exclude)

        for basedir in basedirs:
            if locales:
                dirs = [os.path.join(basedir, l, 'LC_MESSAGES') for l in locales]
            else:
                dirs = [basedir]
            locations = []
            for ldir in dirs:
                for dirpath, dirnames, filenames in os.walk(ldir):
                    locations.extend((dirpath, f) for f in filenames if f.endswith('.po'))
            if locations:
                self.compile_messages(locations)

    def compile_messages(self, locations):
        """
        Locations is a list of tuples: [(directory, file), ...]
        """
        for i, (dirpath, f) in enumerate(locations):
            if self.verbosity > 0:
                commands.echo('processing file %s in %s\n' % (f, dirpath))
            po_path = os.path.join(dirpath, f)
            if has_bom(po_path):
                raise CommandError("The %s file has a BOM (Byte Order Mark). "
                                   "Orun only supports .po files encoded in "
                                   "UTF-8 and without any BOM." % po_path)
            base_path = os.path.splitext(po_path)[0]

            # Check writability on first location
            if i == 0 and not is_writable(base_path + '.mo'):
                commands.echo("The po files under %s are in a seemingly not writable location. "
                                  "mo files will not be updated/created." % dirpath)
                return

            args = [self.program] + self.program_options + ['-o',
                    base_path + '.mo', base_path + '.po']
            output, errors, status = popen_wrapper(args)
            if status:
                if errors:
                    msg = "Execution of %s failed: %s" % (self.program, errors)
                else:
                    msg = "Execution of %s failed" % self.program
                raise CommandError(msg)
