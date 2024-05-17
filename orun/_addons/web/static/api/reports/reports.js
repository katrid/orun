

class Page {
  constructor(page, report) {
    this.page = page;
    this.report = report;
    this.footer = page.find('footer:first') || report.footer;
    this.header = page.find('header:first') || report.header;
  }

  newPage(report) {
    let page = $('<page></page>');
    report.preparedDoc.append(page);
    report.pageCount++;
    report.pageNo++;
    this.height = page.height();

    // add page header
    if (this.header.length) {
      let header = this.header.clone();
      page.append(header);
      this.height -= header.outerHeight(true);
    }
    // add report title
    if ((report.pageCount === 1) && report.title && report.title.length) {
      let header = report.title.clone();
      page.append(header);
      this.height -= header.outerHeight(true);
    }
    let footer = this.footer.clone();
    page.append(footer);
    this.height -= footer.outerHeight(true);
    return page;
  }

  prepare(report) {
    report.pageCount = 0;
    report.pageNo = 0;
    let page = this.newPage(report);
    let ct = 0;
    for (let child of this.page.children('.band')) {
      child = $(child);
      page.append(child);
      let h = child.outerHeight(true);
      if (ct && this.height < h) {
        page = this.newPage(report);
        ct = 0;
      }
      this.height -= h;
      if (ct === 0)
        page.append(child);
      ct += 1;
    }
  }
}


class Report {
  constructor(doc, height) {
    this.height = height;
    if (!doc)
      doc = $('div#report');
    this.doc = doc;
    this.doc.detach();
    let pages = this.doc.children('page');
    if (pages.length)
      for (let p of pages)
        this.pages = [new Page($(p))];
  }

  prepare() {
    this.preparedDoc = $('<report></report>');
    $('body').append(this.preparedDoc);
    for (let p of this.pages)
      p.prepare(this);
  }
}

$(document).ready(() => {
  // let h = document.offsetHeight;
  // let html = $('report').html();
  // for (let i=0;i<100;i++)
  //   document.body.html = '';
  // ReportEngine.load(h);
});

loadReport = function(height, html) {
  let el = $('body').html('');
  let report = new Report(html);
  report.prepare();
  console.log('load report');
  return;
  html = $(html);
  let h = el.find('footer').outerHeight();
  let header = el.find('header');
  h += header.outerHeight();
  report.load(height - h, html, header.outerHeight());
};


var main = function(height) {
  // add header and footer into first page
  let body = $('body');
  let footer = body.children('footer.page-footer:first');
  let header = body.children('header.page-header:first');
  let report = new Report(null, height);
  report.header = header;
  report.footer = footer;
  report.title = body.children('div.band.report-title');
  report.header.detach();
  report.footer.detach();
  report.title.detach();
  report.prepare();
};

