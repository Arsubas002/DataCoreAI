"""Public PWA packaging checks; interactive behavior is in browser.mjs."""
import json
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[1]

class PWASmokeTests(unittest.TestCase):
    def test_manifest_and_install_icons(self):
        manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
        self.assertEqual(manifest['display'],'standalone')
        self.assertEqual(manifest['start_url'],'./index.html')
        self.assertTrue({'192x192','512x512'} <= {i['sizes'] for i in manifest['icons']})
        for icon in manifest['icons']:
            self.assertTrue((ROOT/icon['src']).is_file())
        self.assertTrue((ROOT/'assets/apple-touch-icon.png').is_file())

    def test_offline_shell_covers_all_runtime_modules_and_assets(self):
        sw=(ROOT/'sw.js').read_text()
        for file in ['index.html','styles.css','manifest.webmanifest','icon.svg']+[str(p.relative_to(ROOT)) for p in (ROOT/'js').glob('*.js')]:
            self.assertIn('./'+file,sw)
        self.assertIn("url.pathname.startsWith('/api/')",sw)
        self.assertIn("key.startsWith('datacore-')",sw)

    def test_entrypoint_assets_exist_and_public_code_has_no_provider_key(self):
        html=(ROOT/'index.html').read_text()
        for path in re.findall(r'(?:src|href)="(\./[^"]+)"',html):
            self.assertTrue((ROOT/path.split('?',1)[0]).is_file(),path)
        scripts='\n'.join(p.read_text() for p in (ROOT/'js').glob('*.js'))
        for token in ('api.groq.com','SQLEXPRESS','GROQ_API_KEY','Authorization: Bearer'):
            self.assertNotIn(token,scripts)
        self.assertIn('datos ficticios',html.lower())
        self.assertIn('viewport-fit=cover',html)

    def test_deployment_excludes_private_repository(self):
        ignore=(ROOT.parent/'.vercelignore').read_text()
        self.assertTrue(ignore.startswith('# Deploy'))
        self.assertIn('**/*',ignore)
        self.assertNotIn('!database/',ignore)
        self.assertIn('!api/assistant.mjs',ignore)

if __name__=='__main__':unittest.main()
