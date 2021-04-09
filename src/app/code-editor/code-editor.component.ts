import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CdkOverlayOrigin } from '@angular/cdk/overlay';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.less']
})
export class CodeEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('textarea', { static: true }) textarea: ElementRef;
  @ViewChild('cursorPos', { static: false }) cursorPos: CdkOverlayOrigin;
  opts: string[];
  cursorStyle: any;
  textareaStyle: any;
  fontSize: number;
  lineHeight: number;
  private cnFontWidth: number;
  private nonCnFontWidth: number;
  constructor() { }

  ngOnInit(): void {
    this.opts = ['战士', '弓兵', '法师'];
    this.fontSize = 16;
    this.lineHeight = 20;
    this.cnFontWidth = this.fontSize;
    this.nonCnFontWidth = this.fontSize / 2;

    this.textareaStyle = {
      'font-size': `${this.fontSize}px`,
      'line-height': `${this.lineHeight}px`,
      'word-break': 'break-all'
    };
  }

  ngAfterViewInit() { }



  handleCode(evt: Event) {
    if (!this.textarea || !this.cursorPos) {
      return;
    }
    const el = this.textarea.nativeElement as HTMLTextAreaElement;
    const st = el.selectionStart;

    this.updateCursorPos(evt, el);

    const val = el.value;
    if (
      /@var\(/.test(val.substring(st - 6, st)) &&
      val[st + 1] === ')'
    ) {
      console.log('检测到"@var("');
    } else {

    }

  }

  private updateCursorPos(evt: Event, el: HTMLTextAreaElement) {
    const st = el.selectionStart;
    const bbox = el.getBoundingClientRect();

    const text = el.value;

    const nonChineseMatch = text.substring(0, st).match(/[^\u4E00-\u9FA5]|\s/g);
    let nonChineseCount = 0;
    if (nonChineseMatch) {
      nonChineseCount = nonChineseMatch.length;
      // console.log('非中文数量', nonChineseCount, nonChineseMatch);
    }

    const elWidth = bbox.width;

    const nonCnWidth = nonChineseCount * this.nonCnFontWidth;
    const cnWidth = (st - nonChineseCount) * this.cnFontWidth;
    const totalWdith = nonCnWidth + cnWidth

    const rowIdx = Math.floor(totalWdith / elWidth);
    const left = Math.floor(totalWdith % elWidth);

    this.cursorStyle = {
      position: 'absolute',
      top: `${(rowIdx + 1) * this.lineHeight}px`,
      left: `${left}px`,
    };
  }
}
