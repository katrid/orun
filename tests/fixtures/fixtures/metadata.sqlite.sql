create view books as
select book.id, book.name, book.author_id, author.name as author_name
from fixtures_book book
inner join fixtures_author author on author.id = book.author_id
