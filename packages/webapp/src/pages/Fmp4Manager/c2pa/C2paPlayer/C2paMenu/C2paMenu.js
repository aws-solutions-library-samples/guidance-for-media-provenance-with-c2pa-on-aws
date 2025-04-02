import {
  selectFormattedGenerator,
  selectProducer,
  selectSocialAccounts,
} from 'https://cdn.jsdelivr.net/npm/c2pa@0.18.0-fmp4-alpha.1/+esm';

export var C2PAMenu = function () {
  //Items to show in the c2pa menu
  const c2paMenuItems = {
    SIG_ISSUER: 'Issued by',
    DATE: 'Issued on',
    CLAIM_GENERATOR: 'App or device used',
    NAME: 'Name',
    LOCATION: 'Location',
    WEBSITE: 'Website',
    SOCIAL: 'Social Media',
    VALIDATION_STATUS: 'Current Validation Status',
    ALERT: 'Alert',
  };

  const c2paMenuValueToKeyMap = {};
  for (const key in c2paMenuItems) {
    c2paMenuValueToKeyMap[c2paMenuItems[key]] = key;
  }

  //Delimiter to separate the menu item name from its value
  const c2paMenuDelimiter = '';

  //Alert message to be shown when the c2pa validation has failed
  const c2paAlertPrefix = 'The segment between ';
  const c2paAlertSuffix = ' may have been tampered with';

  //Create an alert message if the c2pa validation has failed
  let c2paAlertMessage = function (compromisedRegions) {
    if (compromisedRegions.length > 0) {
      return c2paAlertPrefix + compromisedRegions.join(', ') + c2paAlertSuffix;
    } else {
      return null;
    }
  };

  return {
    c2paMenuItems: function () {
      return c2paMenuItems;
    },

    c2paMenuDelimiter: function () {
      return c2paMenuDelimiter;
    },

    c2paMenuValueToKeyMap: function (itemValue) {
      return c2paMenuValueToKeyMap[itemValue];
    },

    //Functions to access the c2pa menu items from the c2pa manifest
    c2paItem: function (itemName, c2paStatus, compromisedRegions = []) {
      const verificationStatus = c2paStatus.verified;
      let manifest,
        producer,
        socialMedia,
        generator,
        website,
        longitude,
        latitude = null;

      try {
        manifest = c2paStatus.details.video.manifest;
        console.log('[C2PA] This is the manifest', manifest);
      } catch (error) {
        console.error('[C2PA] Manifest does not exist');
      }
      if (manifest != null && manifest['manifestStore'] != null) {
        const activeManifest = manifest.manifestStore.activeManifest;
        if (itemName == 'SIG_ISSUER') {
          return activeManifest?.signatureInfo?.issuer;
        }
        if (itemName == 'DATE') {
          const timeValue = activeManifest?.signatureInfo?.time;
          const date = timeValue ? new Date(timeValue) : null;
          return date
            ? new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
              }).format(date)
            : null;
        }
        if (itemName == 'CLAIM_GENERATOR') {
          generator = selectFormattedGenerator(activeManifest);
          return generator ?? null;
        }
        if (itemName == 'NAME') {
          producer = selectProducer(activeManifest);
          return producer?.name ?? null;
        }
        if (itemName == 'LOCATION') {
          longitude =
            activeManifest?.assertions.get('stds.exif')[0]?.data[
              'EXIF:GPSLatitude'
            ];
          latitude =
            activeManifest?.assertions.get('stds.exif')[0]?.data[
              'EXIF:GPSLatitude'
            ];
          return [parseFloat(longitude), parseFloat(latitude)] ?? null;
        }
        if (itemName == 'WEBSITE') {
          website = activeManifest.assertions?.get(
            'stds.schema-org.CreativeWork',
          )[0]?.data.url;
          return website ?? null;
        }
        if (itemName == 'SOCIAL') {
          socialMedia = selectSocialAccounts(activeManifest);
          return socialMedia?.map((account) => account['@id']) ?? null;
        }
      }
      if (itemName == 'VALIDATION_STATUS') {
        switch (verificationStatus) {
          case true:
            return 'Passed';
          case false:
            return 'Failed';
          default:
            return 'Unknown';
        }
      }
      if (itemName == 'ALERT') {
        return c2paAlertMessage(compromisedRegions);
      }

      return null;
    },
  };
};
