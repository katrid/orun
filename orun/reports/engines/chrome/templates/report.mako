<%!
  from orun import g, app
  from orun.reports.engines.chrome import xml
%>
<%def name="static(uri)">file://${app.static_reverse(uri)}</%def>

<%def name="table(records)">
<%
    fields = list(xml.read_fields(report.model, capture(caller.body)))
%>
  <table>
    <thead>
    <tr>
      % for field in fields:
        % if field.header:
          <th>${field.header}</th>
        % elif field.field:
			    <th class="${field.field.formfield['type']}">${field.label}</th>
        % endif
      % endfor
    </tr>
    </thead>

    <tbody>
    % for record in records:
    <tr>
	    % for field in fields:
        % if field.body:
          <td>
            ${eval(field.body)}
          </td>
        % elif field.field:
          <td class="${field.field.formfield['type']}">${getattr(record, field.name)}</td>
        % endif
		  % endfor
    </tr>
    % endfor
    </tbody>

    <tfoot>
    <tr>
      % for field in fields:
        % if field.field:
          <th class="${field.field.formfield['type']}">
            % if field.total == 'sum':
              ${total(records, field.name)}
		        % elif field.total == 'avg':
		          ${avg(records, field.name)}
            % endif
          </th>
	      % else:
          <th></th>
        % endif
      % endfor
    </tr>
    </tfoot>

  </table>
</%def>
