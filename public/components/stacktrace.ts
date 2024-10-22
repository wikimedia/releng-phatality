const phpFrameRE = /^(?<frame>from|#\d+) (?<location>[^:]+)(?:: (?<call>.+))?$/;
const sourceRE = /^\/srv\/(?<dir>[^\/]+)\/(?<file>.+)\((?<line>\d+)\)$/;
const mwFileRE = /^(?:php-(?<version>[^\/]+))\/(?:(?<component>extensions|skins|vendor)\/(?<componentName>[^\/]+)\/)?(?<componentFile>.+)$/;
const gitilesURL = 'https://gerrit.wikimedia.org/r/plugins/gitiles';

/**
 * Represents a PHP stacktrace parsed from its textual representation in the
 * error logs.
 */
export class Stacktrace {
  public frames: Array<Frame>;

  /**
   * Constructs a new Stacktrace from the given linewise string, the format
   * typically seen in error reporting.
   *
   */
  constructor(trace: string) {
    this.frames = trace.split(/\r?\n/).filter(line => line != "").map(Frame.fromLine);
  }
}

export interface Blameable {
  getBlameURL(): URL | undefined;
}

export class Frame implements Blameable {
  id: string;
  location: string;
  call?: string;
  parsedFrame?: ParsedFrame;

  /**
   * Attempts to parse a new Frame from the given line.
   */
  static fromLine(line: string): Frame {
    const match = phpFrameRE.exec(line);

    if (!match) {
      throw new Error(`failed to parse stacktrace frame from line "${line}"`);
    }

    return new Frame(match.groups.frame, match.groups.location, match.groups.call);
  }

  constructor(id: string, location: string, call?: string) {
    this.id = id;
    this.location = location;
    this.call = call;

    // Heuristically identify the project and version information from the
    // frame location
    const match = sourceRE.exec(location);

    if (match) {
      const source = match.groups;
      const frameType = dirToParsedFrameTypes[source.dir] || GenericFrame;
      this.parsedFrame = new frameType(source.file, new Number(source.line));
    }
  }

  /**
   * Returns a URL to a git blame for the frame if there is enough parsed
   * information available.
   */
  getBlameURL(): URL | undefined {
    if (this.parsedFrame !== undefined) {
      return this.parsedFrame.getBlameURL();
    }

    return undefined;
  }
}

export interface ParsedFrame extends Blameable {
  file: string;
  line: number;
}

/**
 * Generic project info parsed from a stacktrace frame.
 */
export class GenericFrame implements ParsedFrame {
  file: string;
  line: number;

  project: string;
  projectRef: string;
  projectFile: string;

  constructor(file: string, line: number) {
    this.file = file;
    this.line = line;
  }

  /**
   * Returns a URL to a git blame for the frame if there is enough parsed
   * information available: (project, projectRef, projectFile).
   */
  getBlameURL(): URL | undefined {
    if (this.project && this.projectRef && this.projectFile) {
      return new URL(`${gitilesURL}/${this.project}/+blame/${this.projectRef}/${this.projectFile}#${this.line}`);
    }

    return undefined;
  }
}

/**
 * MediaWiki project info parsed from a stacktrace frame.
 */
export class MediaWikiFrame extends GenericFrame implements ParsedFrame {
  constructor(file: string, line: number) {
    super(file, line);

    if (file.startsWith('php-')) {
      this.project = 'mediawiki';

      const match = mwFileRE.exec(file);

      if (!match) {
        throw new Error(`failed to parse MediaWiki source file "${file}"`);
      }

      this.project += '/' + (match.groups.component || 'core');
      this.projectRef = `refs/heads/wmf/${match.groups.version}`;
      this.projectFile = match.groups.componentFile;

      if (match.groups.componentName !== undefined) {
        if (this.project == 'mediawiki/vendor') {
          this.projectFile = `${match.groups.componentName}/${this.projectFile}`;
        } else {
          this.project += `/${match.groups.componentName}`;
        }
      }
    } else {
      this.project = 'operations/mediawiki-config';
      this.projectRef = 'refs/heads/master';
      this.projectFile = this.file;
    }
  }
}

/**
 * Maps /srv directory names to types to be used when parsing frame information.
 */
const dirToParsedFrameTypes = {
  mediawiki: MediaWikiFrame,
};
