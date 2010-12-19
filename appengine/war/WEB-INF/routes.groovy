// example routes
/*
get "/blog/@year/@month/@day/@title", forward: "/WEB-INF/groovy/blog.groovy?year=@year&month=@month&day=@day&title=@title"
get "/something", redirect: "/blog/2008/10/20/something", cache: 2.hours
get "/book/isbn/@isbn", forward: "/WEB-INF/groovy/book.groovy?isbn=@isbn", validate: { isbn ==~ /\d{9}(\d|X)/ }
*/

// ignore routes
all "/_ah/**", ignore: true, forward: "/workaroundToStopNPE"

// api routes
get "/v@version/@gameid/@endpoint/@method", forward: "/api-v@version/@endpoint/@method.groovy?gameid=@gameid"
get "/v@version/@gameid/@endpoint", forward: "/api-v@version/@endpoint/index.groovy?gameid=@gameid"