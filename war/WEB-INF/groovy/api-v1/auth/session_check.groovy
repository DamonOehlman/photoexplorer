import geominer.v1.types.UserSession;
import geominer.Dumper;

// check for the sessionid parameter
if (! params.sessionid) {
    response.outputStream << "sessionid parameter required";
    return;
} // if

// create the session
def session = UserSession.fromEntity(UserSession.find(datastore, params.sessionid));

// dump the response to the specified stream
Dumper.dump(response, session, params.callback);