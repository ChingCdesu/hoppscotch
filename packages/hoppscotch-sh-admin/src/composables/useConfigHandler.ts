import { AnyVariables, UseMutationResponse } from '@urql/vue';
import { cloneDeep } from 'lodash-es';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import {
  AllowedAuthProvidersDocument,
  EnableAndDisableSsoArgs,
  EnableAndDisableSsoMutation,
  InfraConfigArgs,
  InfraConfigEnum,
  InfraConfigsDocument,
  ResetInfraConfigsMutation,
  ToggleAnalyticsCollectionMutation,
  UpdateInfraConfigsMutation,
} from '~/helpers/backend/graphql';
import { useToast } from './toast';
import { useClientHandler } from './useClientHandler';

// Types
export type SsoAuthProviders = 'google' | 'microsoft' | 'github' | 'openid';

export type Config = {
  providers: {
    google: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
        callback_url: string;
        scope: string;
      };
    };
    github: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
        callback_url: string;
        scope: string;
      };
    };
    microsoft: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
        callback_url: string;
        scope: string;
        tenant: string;
      };
    };
    openid: {
      name: SsoAuthProviders,
      enabled: boolean
      fields: {
        issuer_url: string;
        issuer_name: string;
        issuer_icon_url: string;
        authorization_endpoint: string;
        token_endpoint: string;
        userinfo_endpoint: string;
        jwks_uri: string;
        scopes: string;
        end_session_endpoint: string;
        client_id: string;
        client_secret: string;
      };
    }
  };

  mailConfigs: {
    name: string;
    enabled: boolean;
    fields: {
      mailer_smtp_url: string;
      mailer_from_address: string;
    };
  };

  dataSharingConfigs: {
    name: string;
    enabled: boolean;
  };
};

type UpdatedConfigs = {
  name: string;
  value: string;
};

/** Composable that handles all operations related to server configurations
 * @param updatedConfigs A Config Object contatining the updated configs
 */
export function useConfigHandler(updatedConfigs?: Config) {
  const t = useI18n();
  const toast = useToast();

  // Fetching infra configurations
  const {
    fetching: fetchingInfraConfigs,
    error: infraConfigsError,
    dataAsList: infraConfigs,
    fetchData: fetchInfraConfigs,
  } = useClientHandler(
    InfraConfigsDocument,
    {
      configNames: [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_CALLBACK_URL',
        'GOOGLE_SCOPE',
        'MICROSOFT_CLIENT_ID',
        'MICROSOFT_CLIENT_SECRET',
        'MICROSOFT_CALLBACK_URL',
        'MICROSOFT_SCOPE',
        'MICROSOFT_TENANT',
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'GITHUB_CALLBACK_URL',
        'GITHUB_SCOPE',
        'MAILER_SMTP_URL',
        'MAILER_ADDRESS_FROM',
        'OPENID_ISSUER_URL',
        'OPENID_ISSUER_NAME',
        'OPENID_ISSUER_ICON_URL',
        'OPENID_AUTHORIZATION_ENDPOINT',
        'OPENID_TOKEN_ENDPOINT',
        'OPENID_USERINFO_ENDPOINT',
        'OPENID_JWKS_URI',
        'OPENID_SCOPE',
        'OPENID_END_SESSION_ENDPOINT',
        'OPENID_CLIENT_ID',
        'OPENID_CLIENT_SECRET',
        'ALLOW_ANALYTICS_COLLECTION',
      ] as InfraConfigEnum[],
    },
    (x) => x.infraConfigs
  );

  // Fetching allowed auth providers
  const {
    fetching: fetchingAllowedAuthProviders,
    error: allowedAuthProvidersError,
    dataAsList: allowedAuthProviders,
    fetchData: fetchAllowedAuthProviders,
  } = useClientHandler(
    AllowedAuthProvidersDocument,
    {},
    (x) => x.allowedAuthProviders
  );

  // Current and working configs
  const currentConfigs = ref<Config>();
  const workingConfigs = ref<Config>();

  onMounted(async () => {
    await fetchInfraConfigs();
    await fetchAllowedAuthProviders();

    const getFieldValue = (name: string) =>
      infraConfigs.value.find((x) => x.name === name)?.value ?? '';

    // Transforming the fetched data into a Configs object
    currentConfigs.value = {
      providers: {
        google: {
          name: 'google',
          enabled: allowedAuthProviders.value.includes('GOOGLE'),
          fields: {
            client_id: getFieldValue('GOOGLE_CLIENT_ID'),
            client_secret: getFieldValue('GOOGLE_CLIENT_SECRET'),
            callback_url: getFieldValue('GOOGLE_CALLBACK_URL'),
            scope: getFieldValue('GOOGLE_SCOPE'),
          },
        },
        github: {
          name: 'github',
          enabled: allowedAuthProviders.value.includes('GITHUB'),
          fields: {
            client_id: getFieldValue('GITHUB_CLIENT_ID'),
            client_secret: getFieldValue('GITHUB_CLIENT_SECRET'),
            callback_url: getFieldValue('GITHUB_CALLBACK_URL'),
            scope: getFieldValue('GITHUB_SCOPE'),
          },
        },
        microsoft: {
          name: 'microsoft',
          enabled: allowedAuthProviders.value.includes('MICROSOFT'),
          fields: {
            client_id: getFieldValue('MICROSOFT_CLIENT_ID'),
            client_secret: getFieldValue('MICROSOFT_CLIENT_SECRET'),
            callback_url: getFieldValue('MICROSOFT_CALLBACK_URL'),
            scope: getFieldValue('MICROSOFT_SCOPE'),
            tenant: getFieldValue('MICROSOFT_TENANT'),
          },
        },
        openid: {
          name: 'openid',
          enabled: allowedAuthProviders.value.includes('OPENID'),
          fields: {
            issuer_url:
              infraConfigs.value.find((x) => x.name === 'OPENID_ISSUER_URL')
                ?.value ?? '',
            issuer_name:
              infraConfigs.value.find((x) => x.name === 'OPENID_ISSUER_NAME')
                ?.value ?? '',
            issuer_icon_url:
              infraConfigs.value.find((x) => x.name === 'OPENID_ISSUER_ICON_URL')
                ?.value ?? '',
            authorization_endpoint:
              infraConfigs.value.find((x) => x.name === 'OPENID_AUTHORIZATION_ENDPOINT')
                ?.value ?? '',
            token_endpoint:
              infraConfigs.value.find((x) => x.name === 'OPENID_TOKEN_ENDPOINT')
                ?.value ?? '',
            userinfo_endpoint: 
              infraConfigs.value.find((x) => x.name === 'OPENID_USERINFO_ENDPOINT')
                ?.value ?? '',
            jwks_uri:
              infraConfigs.value.find((x) => x.name === 'OPENID_JWKS_URI')
                ?.value ?? '',
            scopes:
              infraConfigs.value.find((x) => x.name === 'OPENID_SCOPE')
                ?.value ?? '',
            end_session_endpoint:
              infraConfigs.value.find((x) => x.name === 'OPENID_END_SESSION_ENDPOINT')
                ?.value ?? '',
            client_id:
              infraConfigs.value.find((x) => x.name === 'OPENID_CLIENT_ID')
                ?.value ?? '',
            client_secret:
              infraConfigs.value.find((x) => x.name === 'OPENID_CLIENT_SECRET')
                ?.value ?? '',
          }
        }
      },
      mailConfigs: {
        name: 'email',
        enabled: allowedAuthProviders.value.includes('EMAIL'),
        fields: {
          mailer_smtp_url: getFieldValue('MAILER_SMTP_URL'),
          mailer_from_address: getFieldValue('MAILER_ADDRESS_FROM'),
        },
      },
      dataSharingConfigs: {
        name: 'data_sharing',
        enabled: !!infraConfigs.value.find(
          (x) => x.name === 'ALLOW_ANALYTICS_COLLECTION' && x.value === 'true'
        ),
      },
    };

    // Cloning the current configs to working configs
    // Changes are made only to working configs
    workingConfigs.value = cloneDeep(currentConfigs.value);
  });

  // Transforming the working configs back into the format required by the mutations
  const updatedInfraConfigs = computed(() => {
    let config: UpdatedConfigs[] = [
      {
        name: '',
        value: '',
      },
    ];

    if (updatedConfigs?.providers.google.enabled) {
      config.push(
        {
          name: 'GOOGLE_CLIENT_ID',
          value: updatedConfigs?.providers.google.fields.client_id ?? '',
        },
        {
          name: 'GOOGLE_CLIENT_SECRET',
          value: updatedConfigs?.providers.google.fields.client_secret ?? '',
        },
        {
          name: 'GOOGLE_CALLBACK_URL',
          value: updatedConfigs?.providers.google.fields.callback_url ?? '',
        },
        {
          name: 'GOOGLE_SCOPE',
          value: updatedConfigs?.providers.google.fields.scope ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'GOOGLE_CLIENT_ID' &&
          item.name !== 'GOOGLE_CLIENT_SECRET' &&
          item.name !== 'GOOGLE_CALLBACK_URL' &&
          item.name !== 'GOOGLE_SCOPE'
      );
    }
    if (updatedConfigs?.providers.microsoft.enabled) {
      config.push(
        {
          name: 'MICROSOFT_CLIENT_ID',
          value: updatedConfigs?.providers.microsoft.fields.client_id ?? '',
        },
        {
          name: 'MICROSOFT_CLIENT_SECRET',
          value: updatedConfigs?.providers.microsoft.fields.client_secret ?? '',
        },
        {
          name: 'MICROSOFT_CALLBACK_URL',
          value: updatedConfigs?.providers.microsoft.fields.callback_url ?? '',
        },
        {
          name: 'MICROSOFT_SCOPE',
          value: updatedConfigs?.providers.microsoft.fields.scope ?? '',
        },
        {
          name: 'MICROSOFT_TENANT',
          value: updatedConfigs?.providers.microsoft.fields.tenant ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'MICROSOFT_CLIENT_ID' &&
          item.name !== 'MICROSOFT_CLIENT_SECRET' &&
          item.name !== 'MICROSOFT_CALLBACK_URL' &&
          item.name !== 'MICROSOFT_SCOPE' &&
          item.name !== 'MICROSOFT_TENANT'
      );
    }

    if (updatedConfigs?.providers.github.enabled) {
      config.push(
        {
          name: 'GITHUB_CLIENT_ID',
          value: updatedConfigs?.providers.github.fields.client_id ?? '',
        },
        {
          name: 'GITHUB_CLIENT_SECRET',
          value: updatedConfigs?.providers.github.fields.client_secret ?? '',
        },
        {
          name: 'GITHUB_CALLBACK_URL',
          value: updatedConfigs?.providers.github.fields.callback_url ?? '',
        },
        {
          name: 'GITHUB_SCOPE',
          value: updatedConfigs?.providers.github.fields.scope ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'GITHUB_CLIENT_ID' &&
          item.name !== 'GITHUB_CLIENT_SECRET' &&
          item.name !== 'GITHUB_CALLBACK_URL' &&
          item.name !== 'GITHUB_SCOPE'
      );
    }

    if (updatedConfigs?.mailConfigs.enabled) {
      config.push(
        {
          name: 'MAILER_SMTP_URL',
          value: updatedConfigs?.mailConfigs.fields.mailer_smtp_url ?? '',
        },
        {
          name: 'MAILER_ADDRESS_FROM',
          value: updatedConfigs?.mailConfigs.fields.mailer_from_address ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'MAILER_SMTP_URL' && item.name !== 'MAILER_ADDRESS_FROM'
      );
    }

    config = config.filter((item) => item.name !== '');

    return config;
  });

  // Checking if any of the config fields are empty
  const isFieldEmpty = (field: string) => field.trim() === '';

  type ConfigSection = {
    enabled: boolean;
    fields: Record<string, string>;
  };

  const AreAnyConfigFieldsEmpty = (config: Config): boolean => {
    const sections: Array<ConfigSection> = [
      config.providers.github,
      config.providers.google,
      config.providers.microsoft,
      config.mailConfigs,
    ];

    return sections.some(
      (section) =>
        section.enabled && Object.values(section.fields).some(isFieldEmpty)
    );
  };

  // Transforming the working configs back into the format required by the mutations
  const updatedAllowedAuthProviders = computed(() => {
    return [
      {
        provider: 'GOOGLE',
        status: updatedConfigs?.providers.google.enabled ? 'ENABLE' : 'DISABLE',
      },
      {
        provider: 'MICROSOFT',
        status: updatedConfigs?.providers.microsoft.enabled
          ? 'ENABLE'
          : 'DISABLE',
      },
      {
        provider: 'GITHUB',
        status: updatedConfigs?.providers.github.enabled ? 'ENABLE' : 'DISABLE',
      },
      {
        provider: 'EMAIL',
        status: updatedConfigs?.mailConfigs.enabled ? 'ENABLE' : 'DISABLE',
      },
    ];
  });

  // Generic function to handle mutation execution and error handling
  const executeMutation = async <T, V>(
    mutation: UseMutationResponse<T>,
    variables: AnyVariables = undefined,
    errorMessage: string
  ): Promise<boolean> => {
    const result = await mutation.executeMutation(variables);

    if (result.error) {
      toast.error(t(errorMessage));
      return false;
    }

    return true;
  };

  // Updating the auth provider configurations
  const updateAuthProvider = (
    updateProviderStatus: UseMutationResponse<EnableAndDisableSsoMutation>
  ) =>
    executeMutation(
      updateProviderStatus,
      {
        providerInfo:
          updatedAllowedAuthProviders.value as EnableAndDisableSsoArgs[],
      },
      'configs.auth_providers.update_failure'
    );

  // Updating the infra configurations
  const updateInfraConfigs = (
    updateInfraConfigsMutation: UseMutationResponse<UpdateInfraConfigsMutation>
  ) =>
    executeMutation(
      updateInfraConfigsMutation,
      {
        infraConfigs: updatedInfraConfigs.value as InfraConfigArgs[],
      },
      'configs.mail_configs.update_failure'
    );

  // Resetting the infra configurations
  const resetInfraConfigs = (
    resetInfraConfigsMutation: UseMutationResponse<ResetInfraConfigsMutation>
  ) =>
    executeMutation(
      resetInfraConfigsMutation,
      undefined,
      'configs.reset.failure'
    );

  // Updating the data sharing configurations
  const updateDataSharingConfigs = (
    toggleDataSharingMutation: UseMutationResponse<ToggleAnalyticsCollectionMutation>
  ) =>
    executeMutation(
      toggleDataSharingMutation,
      {
        status: updatedConfigs?.dataSharingConfigs.enabled
          ? 'ENABLE'
          : 'DISABLE',
      },
      'configs.data_sharing.update_failure'
    );

  return {
    currentConfigs,
    workingConfigs,
    updatedInfraConfigs,
    updatedAllowedAuthProviders,
    updateAuthProvider,
    updateDataSharingConfigs,
    updateInfraConfigs,
    resetInfraConfigs,
    fetchingInfraConfigs,
    fetchingAllowedAuthProviders,
    infraConfigsError,
    allowedAuthProvidersError,
    AreAnyConfigFieldsEmpty,
  };
}
