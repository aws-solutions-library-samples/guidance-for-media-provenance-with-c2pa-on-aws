// From the Verify codebase 2023
//   ADOBE CONFIDENTIAL
//   Copyright 2022 Adobe
//   All Rights Reserved.
//   NOTICE: All information contained herein is, and remains
//   the property of Adobe and its suppliers, if any. The intellectual
//   and technical concepts contained herein are proprietary to Adobe
//   and its suppliers and are protected by all applicable intellectual
//   property laws, including trade secret and copyright laws.
//   Dissemination of this information or reproduction of this material
//   is strictly forbidden unless prior written permission is obtained
//   from Adobe.

const matchers = [
    { pattern: /nikon/i, name: 'Nikon' },
    { pattern: /photoshop/i, name: 'Photoshop' },
    { pattern: /adobe\sexpress/i, name: 'Adobe Express' },
    { pattern: /adobe\sfirefly/i, name: 'Adobe Firefly' },
    { pattern: /adobe\sstock/i, name: 'Adobe Stock' },
    { pattern: /adobe/i, name: 'Adobe' },
    { pattern: /behance\.net/i,name: 'Behance' },
    { pattern: /facebook\.com/i, name: 'Facebook' },
    { pattern: /instagram\.com/i, name: 'Instagram' },
    { pattern: /linkedin\.com/i, name: 'LinkedIn' },
    // Behance staging
    {
        pattern: /net\.s2stagehance\.com/i,
        name: 'Behance (staging)',
    },
    { pattern: /truepic/i,name: 'Truepic' },
    { pattern: /twitter\.com/i, name: 'Twitter' },
    { pattern: /pinterest\.com/i, name: 'Pinterest' },
    { pattern: /vimeo\.com/i, name: 'Vimeo' },
    { pattern: /youtube\.com/i, name: 'YouTube' },
    { pattern: /leica/i,name: 'Leica' },
    { pattern: /M11/i, name: 'Leica' },
    { pattern: /lightroom/i,name: 'Adobe Lightroom' },
];

export function providerInfoFromSocialId(url) {
    return matchers.find(({ pattern }) => pattern.test(url));
}