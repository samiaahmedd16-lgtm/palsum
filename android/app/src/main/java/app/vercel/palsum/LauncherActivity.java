package app.vercel.palsum;

import android.net.Uri;

/** Keep OAuth in a supported browser and accept app links only for Palsum. */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = super.getLaunchingUrl();
        if (uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && "palsum.vercel.app".equalsIgnoreCase(uri.getHost())) {
            return uri;
        }
        return Uri.parse(getString(R.string.launch_url));
    }
}
