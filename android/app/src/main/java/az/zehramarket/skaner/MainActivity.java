package az.zehramarket.skaner;

import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.security.MessageDigest;

public class MainActivity extends BridgeActivity {

    // SHA-256 fingerprint of our own server's self-signed certificate (see
    // getOrCreateHttpsCert in server/index.js) — computed once from
    // local-data/https-cert.pem and pinned here. A WebView has no "click
    // through the warning" UI the way a browser tab does, so something has
    // to decide whether to trust it; rather than accepting every SSL error
    // (which would trust literally anything), this only proceeds when the
    // certificate actually presented matches this exact fingerprint.
    //
    // IMPORTANT: this must be updated (and the APK rebuilt) if the server's
    // certificate is ever regenerated — e.g. the server ran on a genuinely
    // new LAN IP for the first time (see https-cert-ips.json on the
    // server). Recompute with:
    //   node -e "const c=require('crypto'),f=require('fs');const p=f.readFileSync('local-data/https-cert.pem','utf-8');const b=Buffer.from(p.replace(/-----(BEGIN|END) CERTIFICATE-----/g,'').replace(/\s+/g,''),'base64');console.log(c.createHash('sha256').update(b).digest('hex').toUpperCase())"
    private static final String PINNED_CERT_SHA256 = "FFD667D22498E6C952E2FEBD75725AC7D7E2FF6113F640C5EC903CDF34103C7F";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                if (isPinnedCertificate(error.getCertificate())) {
                    handler.proceed();
                } else {
                    handler.cancel();
                }
            }
        });
    }

    private boolean isPinnedCertificate(SslCertificate cert) {
        try {
            Bundle bundle = SslCertificate.saveState(cert);
            byte[] derBytes = bundle.getByteArray("x509-certificate");
            if (derBytes == null) return false;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(derBytes);
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02X", b));
            return hex.toString().equals(PINNED_CERT_SHA256);
        } catch (Exception e) {
            return false;
        }
    }
}
