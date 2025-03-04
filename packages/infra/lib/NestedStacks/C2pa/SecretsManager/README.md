# Sample Certificate & Private Key

Copy the certificate and private key files from the public sample repository (https://github.com/contentauth/c2patool/tree/main/sample) into this local directory. The downloaded files must retain the same names as the ones in the repository:

- ps256.pem
- ps256.pub

Alternatively, you can run the following commands to download these files directly using [`wget`](https://www.gnu.org/software/wget/):

```bash
wget https://raw.githubusercontent.com/contentauth/c2patool/main/sample/ps256.pem
wget https://raw.githubusercontent.com/contentauth/c2patool/main/sample/ps256.pub
```

## Custom Certificate & Private Key

If you prefer to use your own custom certificate and private key, simply replace the contents of the `ps256.pem` and `ps256.pub` files with your own credentials.
