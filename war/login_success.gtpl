<% include '/WEB-INF/includes/header.gtpl' %>

<h1>Login Success</h1>
<p>
Welcome <%= request.getAttribute('user').name %>
</p>
<script>
var returnUrl = '<%= request.getAttribute("returnUrl") %>';
if (window.opener) {
	setTimeout(window.close, 1500);
	document.write('<p>Now returning to you to your normal viewing</p>');
}
else if (returnUrl) {
	document.write('<p><a href="' + returnUrl + '">Return to your application</a></p>');
} // if..else
</script>

<% include '/WEB-INF/includes/footer.gtpl' %>