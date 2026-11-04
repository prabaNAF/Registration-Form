import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import Portal from '../app/portal';
import {getCollege} from '../lib/domain';
const college=getCollege(document.documentElement.dataset.college);
hydrateRoot(document.getElementById('root')!,<Portal collegeId={college?.id}/>);
