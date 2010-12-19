import geominer.v1.types.UserSession;
import twitter4j.Twitter;
import twitter4j.TwitterException;
import twitter4j.http.RequestToken;
import twitter4j.http.AccessToken;

Twitter twitter = new Twitter();
twitter.setOAuthConsumer('3uiiMfokAPndHucs3Qo7g', 'Bnkq0f72M9LEmPHhqg5jAwYzQIFmj9TyNAtv86BMOCk');

// Twitter twitter = (Twitter) request.getSession().getAttribute("twitter");
RequestToken requestToken = (RequestToken) request.getSession().getAttribute("requestToken");
String verifier = request.getParameter("oauth_verifier");

AccessToken accessToken = twitter.getOAuthAccessToken(requestToken, verifier);

/* look for the specified session */
def session = UserSession.findByRequestToken(datastore, requestToken.token);
if (! session) {
    response.outputStream << "unable to locate required session";
    return;
} // if

session.accessToken = accessToken.token;
session.save();

// request.getSession().removeAttribute("twitter");
request.getSession().removeAttribute("requestToken");

// Storage.createPerson();
// response.outputStream << 'Verified successfully: ' + twitter.verifyCredentials().name;

request.setAttribute 'user', twitter.verifyCredentials();
request.setAttribute 'returnUrl', request.getSession().getAttribute('returnUrl');
forward '/login_success.gtpl'