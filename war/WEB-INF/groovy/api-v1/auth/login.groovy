import geominer.v1.types.UserSession;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.http.RequestToken;

// check for the sessionid parameter
if (! params.sessionid) {
    response.outputStream << "sessionid parameter required";
    return;
} // if

/* look for the specified session */
def session = UserSession.find(datastore, params.sessionid);
if (! session) {
    response.outputStream << "unable to locate specified session";
    return;
} // if

/* run the twitter authentication process */

Twitter twitter = new Twitter();

twitter.setOAuthConsumer('3uiiMfokAPndHucs3Qo7g', 'Bnkq0f72M9LEmPHhqg5jAwYzQIFmj9TyNAtv86BMOCk');

StringBuffer callbackURL = request.getRequestURL();
int index = callbackURL.lastIndexOf("/");
callbackURL.replace(index, callbackURL.length(), "").append("/callback.groovy");

RequestToken requestToken = twitter.getOAuthRequestToken(callbackURL.toString());
request.getSession().setAttribute("requestToken", requestToken);
request.getSession().setAttribute("returnUrl", params.returnUrl);

// update the session entity with the request token and save it
session.requestToken = requestToken.token;
session.save();

// redirect to twitter
redirect requestToken.getAuthenticationURL();