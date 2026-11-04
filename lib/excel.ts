import { strToU8, zipSync } from "fflate";

export type ExcelCell=string|number|null|undefined;
export type ExcelSheet={name:string;rows:ExcelCell[][];widths?:number[]};
const xml=(value:unknown)=>String(value??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,"")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
function column(index:number):string {let value="";for(let n=index+1;n>0;n=Math.floor((n-1)/26))value=String.fromCharCode(65+(n-1)%26)+value;return value;}

// Standards-based OOXML workbook. All user text is an inline string, never a
// formula, preserving contact numbers and avoiding spreadsheet formula execution.
export function excelWorkbook(sheets:ExcelSheet[]):Uint8Array {
  const files:Record<string,Uint8Array>={};
  const add=(path:string,content:string)=>{files[path]=strToU8(declaration+content);};
  add("[Content_Types].xml",`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
  add("_rels/.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  add("xl/workbook.xml",`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet,i)=>`<sheet name="${xml(sheet.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`);
  add("xl/_rels/workbook.xml.rels",`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  add("xl/styles.xml",`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><color rgb="FF203E2F"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF27573C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  sheets.forEach((sheet,i)=>{
    const width=Math.max(1,...sheet.rows.map(row=>row.length));
    const range=`A1:${column(width-1)}${Math.max(1,sheet.rows.length)}`;
    const rows=sheet.rows.map((row,r)=>`<row r="${r+1}"${r===0?' ht="32" customHeight="1"':""}>${row.map((value,c)=>{
      const cell=`r="${column(c)}${r+1}" s="${r===0?1:2}"`;
      return typeof value==="number"&&Number.isFinite(value)?`<c ${cell} t="n"><v>${value}</v></c>`:`<c ${cell} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join("")}</row>`).join("");
    add(`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="${ns}"><dimension ref="${range}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="19"/><cols>${Array.from({length:width},(_,c)=>`<col min="${c+1}" max="${c+1}" width="${sheet.widths?.[c]||24}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData><autoFilter ref="${range}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`);
  });
  return zipSync(files,{level:6});
}
