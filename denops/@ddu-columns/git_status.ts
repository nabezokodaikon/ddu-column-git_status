import {
  dirname,
  join,
} from 'https://deno.land/std/path/mod.ts';
import {
  BaseColumn,
  DduItem,
  ItemHighlight,
} from "https://deno.land/x/ddu_vim@v4.1.0/types.ts";
import {
  GetTextResult,
} from "https://deno.land/x/ddu_vim@v4.1.0/base/column.ts";
import {
  ActionData,
} from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";

type GitStatusData = {
  Status: string;
  PathArray: string[];
};

export class Column extends BaseColumn<Params> {

  cwd = Deno.cwd();
  command = new Deno.Command(
    "git", {
    args: ["status", "-s"]
  });
  dataArray: GitStatusData[] = [];
  previewStdout: string;
  textDecoder = new TextDecoder();

  override getLength(args: {
    items: DduItem[];
  }): number {
    if (args.items.length < 1) {
      return 0;
    } else if (args.items[0].__level != 0) {
      return 0;
    }

    const { code, stdout } = this.command.outputSync();
    if (code === 0) {
      const text = this.textDecoder.decode(stdout);
      if (this.previewStdout === text) {
        return 0;
      }

      this.previewStdout = text;
      this.dataArray = text.split(/\n/).map(line => {
        const path = line.substring(3);
        const status = line.substring(0, 2);
        const pathArray: string[] = [join(this.cwd, path)];

        let dir = path;
        while (true) {
          dir = dirname(dir);
          if (dir != ".") {
            pathArray.push(join(this.cwd, dir));
          } else {
            break;
          }
        }

        return <GitStatusData> {
          Status: status,
          PathArray: pathArray,
        };
      });
    }

    return 0;
  }

  override getBaseText(args: {
    item: DduItem
  }): string {
    const action = args.item.action as ActionData;
    const path = action.path;

    for (let i = 0; i < this.dataArray.length; i++) {
      const data = this.dataArray[i];
      for (let j = 0; j < data.PathArray.length; j++) {
        const dataPath = data.PathArray[j];
        if (dataPath == path) {
          return ` [${data.Status}]`;
        }
      }
    }

    return "";
  }

  override getText(args: {
    item: DduItem,
    baseText: string,
  }): GetTextResult {

    const itemHighlights: ItemHighlight[] = [];
    itemHighlights.push({
      name: "column-gitstatus-icon",
      "hl_group": "Special",
      col: args.item.display.length + 2,
      width: 4,
    });

    return {
      text: args.baseText,
      highlights: itemHighlights,
    };
  }

  override params(): Params {
    return {};
  }
}

