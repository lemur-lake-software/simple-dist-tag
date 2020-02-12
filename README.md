This is an extremely simple tool for selecting the dist tag that ``npm publish`` should use.

This tool has no configuration... and it is likely to stay this way. I see the lack of configuration as a feature. Configuration is easy to mess up.

Moreover, this tool certainly does not support all possible usages of dist tags. This tool was created to satisfy my own needs. If it suits you too, fine. If not, you can use another tool.

Algorithm
=========

This tool must run **after** the new version number has been edited into ``package.json``. You can edit it manually, or tools like ``npm version`` can edit it for you. It read the version number from ``package.json``, this version number is called ``newVersion`` in the following explanations.

The tool fetches the previous dist tag usage from ``https://registry.npmjs.org/``.

1. If ``newVersion`` is not a prerelease, then the selected dist tag is provisionally "latest".

2. If ``newVersion`` is a prerelease, then the selected dist tag depends on the first part of the prerelease. This tool uses ``semver.prerelease()`` to break the prerelease into parts. A dist tag is provisionally set to the value obtained from a lookup in this table:

    | prerelease part | dist tag |
    |-----------------|----------|
    | alpha           | dev      |
    | beta            | dev      |
    | rc              | next     |

  A prerelease part other than those above is an error.

3. If the provisional dist tag already has a version history and the latest version in that version history is greater than ``newVersion`` then the final dist tag is ``patch``. Otherwise, the provisional dist tag becomes the final dist tag. (Note that the case where the latest version is equal to ``newVersion`` is not considered. When this happens, you're trying to publish anew a version that was already published, which ``npm`` forbids. There's no correct solution in such a case.)

The last step is there for scenarios where you maintain multiple branches of a
project. Say you have released version ``2.0.0`` and then want to release a patch with version ``1.2.3`` because series 1 is still supported. Prior to releasing ``1.2.3``, ``latest`` points to ``2.0.0`` **and you want to keep it this way after releasing ``1.2.3``. Unfortunately, ``npm`` provides no way to publish a new version without associating a dist tag with it. We use ``patch`` for that purpose. In the hypothetical scenario we just gave ``1.2.3`` would be assigned the ``patch`` dist tag. Note that the progression of the ``patch`` dist tag is not organized in any logical order. If ``3.0.0`` has been released and then you release ``2.1.3`` and then you release ``1.2.3`` then ``patch`` will point to ``1.2.3``. The version published latest wins (not the one with the highest version number). ``patch`` is merely a dumping ground to prevent those dist tags that matter from being clobbered.

**IMPORTANT NOTE:** If you start publishing your package with semvers that have prerelease parts like ``alpha`` or ``rc`` then you'll be publishing to dist tags other than ``latest``. If that bothers you, your solutions are: 1) use ``0.x.x`` releases, 2) fix it manually.

Integration
===========

This package installs a script among the bins installed by ``npm`` named ``simple-dist-tag``. This command computes the dist tag to use and outputs it to stdout.

If you invoke ``npm publish`` in a script directly, you can pass the output as argument:

```
npm publish --tag `simple-dist-tag`

```

If you are using a tool that invokes ``npm publish`` for you, you can use it to set the ``npm_config_tag`` environment variable so that ``npm publish`` uses the tag specified. Example:

```
env npm_config_tag=`simple-dist-tag` tool-that-invokes-npm-publish
```
