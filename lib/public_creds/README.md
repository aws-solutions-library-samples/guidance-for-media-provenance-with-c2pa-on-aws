# Sample Certificate & Private Key

Copy the certificate and private key files from the public sample repository (https://github.com/contentauth/c2patool/tree/main/sample) into this local directory. The downloaded files must retain the same names as the ones in the repository:

- es256_certs.pem
- es256_private.key

Alternatively, you can run the following commands to download these files directly using [`wget`](https://www.gnu.org/software/wget/):

```bash
wget https://raw.githubusercontent.com/contentauth/c2patool/main/sample/es256_certs.pem
wget https://raw.githubusercontent.com/contentauth/c2patool/main/sample/es256_private.key
```

## Custom Certificate & Private Key

If you prefer to use your own custom certificate and private key, simply replace the contents of the `es256_certs.pem` and `es256_private.key` files with your own credentials.
