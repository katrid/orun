import os
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage
from PyQt5.QtWidgets import QApplication
from PyQt5 import QtGui, QtCore
from PyQt5.QtCore import QUrl


class ChromePDF:
    prepared = False
    qapp = None
    view = None
    page = None
    first_time = True

    @classmethod
    def prepare(cls):
        if cls.qapp is None:
            cls.qapp = QApplication(['--disable-gpu', '--disable-extension'])
        cls.view = QWebEngineView()
        cls.page = QWebEnginePage()
        cls.view.setPage(cls.page)

        size = QtGui.QPageSize(QtGui.QPageSize.A4)
        cls.page_layout = QtGui.QPageLayout(
            size, QtGui.QPageLayout.Portrait, QtCore.QMarginsF(10, 10, 10, 10)
        )
        cls.height = size.sizePixels(96).height() - 60

    @classmethod
    def print_to_pdf(cls, html, pdf_file):
        if not cls.prepared:
            cls.prepare()

        def pdf_printed(*args, **kwargs):
            cls.page.pdfPrintingFinished.disconnect()
            cls.qapp.quit()

        def page_loaded(*args, **kwargs):
            cls.page.loadFinished.disconnect()
            cls.page.runJavaScript('main(%s)' % cls.height)
            cls.page.pdfPrintingFinished.connect(pdf_printed)
            cls.page.printToPdf(
                pdf_file,
                cls.page_layout
            )

        if isinstance(html, bytes):
            html = html.decode('utf-8')
        if cls.first_time:
            cls.first_time = False
            cls.view.setHtml(html, QUrl('file://'))
            cls.page.loadFinished.connect(page_loaded)
        else:
            cls.view.setHtml(html, QUrl('file://'))
            cls.page.loadFinished.connect(page_loaded)
        cls.qapp.exec_()

        return os.path.basename(pdf_file)
